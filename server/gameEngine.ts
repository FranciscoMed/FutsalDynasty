import type { IStorage } from "./storage";
import type { GameState, Player, PlayerAttributes } from "@shared/schema";

export class GameEngine {
  constructor(private storage: IStorage) {}

  async advanceOneDay(saveGameId: number): Promise<GameState & { matchesToday?: any[] }> {
    const gameState = await this.storage.getGameState(saveGameId);
    const currentDate = new Date(gameState.currentDate);
    
    currentDate.setDate(currentDate.getDate() + 1);
    
    const newMonth = currentDate.getMonth() + 1;
    const oldMonth = gameState.currentMonth;
    
    const monthChanged = newMonth !== oldMonth;
    
    if (monthChanged) {
      await this.processMonthlyEvents(saveGameId, gameState, currentDate);
    }
    
    const updatedState = await this.storage.updateGameState(saveGameId, {
      currentDate,
      currentMonth: newMonth,
    });

    // Check for matches on the new date
    const matchesToday = await this.getMatchesOnDate(saveGameId, currentDate);
    
    // Filter to only matches involving the player's team that need preparation
    const playerMatchesToday = matchesToday.filter(match => 
      match.homeTeamId === gameState.playerTeamId || 
      match.awayTeamId === gameState.playerTeamId
    );

    // Update nextMatchId if there's a player match today
    if (playerMatchesToday.length > 0) {
      const nextMatch = playerMatchesToday[0];
      await this.storage.updateGameState(saveGameId, {
        nextMatchId: nextMatch.id,
      });
    }
    
    return {
      ...updatedState,
      matchesToday: playerMatchesToday,
    };
  }

  async advanceDays(saveGameId: number, days: number): Promise<GameState> {
    let currentState = await this.storage.getGameState(saveGameId);
    
    for (let i = 0; i < days; i++) {
      currentState = await this.advanceOneDay(saveGameId);
    }
    
    return currentState;
  }

  async advanceToDate(saveGameId: number, targetDate: Date): Promise<GameState> {
    const gameState = await this.storage.getGameState(saveGameId);
    const currentDate = new Date(gameState.currentDate);
    const target = new Date(targetDate);
    
    while (currentDate < target) {
      await this.advanceOneDay(saveGameId);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return await this.storage.getGameState(saveGameId);
  }

  private async processMonthlyEvents(saveGameId: number, gameState: GameState, newDate: Date): Promise<void> {
    const newMonth = newDate.getMonth() + 1;
    const newYear = newDate.getFullYear();
    
    console.log(`Processing monthly events for month ${newMonth}/${newYear}`);
    
    await this.processMonthlyPayments(saveGameId, gameState);
    
    await this.processPlayerDevelopment(saveGameId, gameState, newDate);
    
    await this.processPlayerAging(saveGameId, gameState, newMonth);
    
    await this.updateSeasonIfNeeded(saveGameId, gameState, newMonth, newYear);
    
    await this.storage.createInboxMessage(saveGameId, {
      category: "news",
      subject: `Monthly Report - ${this.getMonthName(newMonth)} ${newYear}`,
      body: `Your monthly report for ${this.getMonthName(newMonth)} is ready.\n\nKey highlights:\n- Player development continues\n- Wages have been paid\n- Check your finances for detailed breakdown`,
      from: "Club Secretary",
      date: newDate,
      read: false,
      starred: false,
      priority: "medium",
    });
    
    await this.storage.updateGameState(saveGameId, {
      lastTrainingReportMonth: newMonth,
    });
  }

  private async processMonthlyPayments(saveGameId: number, gameState: GameState): Promise<void> {
    const players = await this.storage.getPlayersByTeam(saveGameId, gameState.playerTeamId);
    const totalWages = players.reduce((sum, p) => sum + p.contract.salary, 0);
    
    const club = await this.storage.getClub(saveGameId);
    if (club) {
      await this.storage.updateClub(saveGameId, {
        budget: club.budget - totalWages,
      });
      
      await this.storage.createFinancialTransaction(saveGameId, {
        date: new Date(gameState.currentDate),
        type: "expense",
        category: "wage",
        amount: totalWages,
        description: `Monthly wages payment for ${players.length} players`,
      });
    }
  }

  private async processPlayerDevelopment(saveGameId: number, gameState: GameState, reportDate: Date): Promise<void> {
    const players = await this.storage.getPlayersByTeam(saveGameId, gameState.playerTeamId);
    const trainingReport: Array<{ playerName: string; changes: string[] }> = [];
    
    for (const player of players) {
      const { improvements } = await this.developPlayer(saveGameId, player);
      if (improvements.length > 0 && improvements[0] !== "No significant changes") {
        trainingReport.push({
          playerName: player.name,
          changes: improvements,
        });
      }
    }
    
    if (trainingReport.length > 0) {
      await this.generateTrainingReport(saveGameId, reportDate, trainingReport);
    }
  }

  private async developPlayer(saveGameId: number, player: Player): Promise<{ improvements: string[] }> {
    const age = player.age;
    let baseGrowthRate = 0;
    
    if (age <= 21) {
      baseGrowthRate = 24 + Math.floor(Math.random() * 17);
    } else if (age <= 25) {
      baseGrowthRate = 16 + Math.floor(Math.random() * 13);
    } else if (age <= 29) {
      baseGrowthRate = 8 + Math.floor(Math.random() * 13);
    } else if (age <= 32) {
      baseGrowthRate = 4 + Math.floor(Math.random() * 9);
    } else {
      baseGrowthRate = -Math.floor(Math.random() * 6);
    }
    
    const trainingIntensityMultiplier = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
    }[player.trainingFocus.intensity];
    
    const potentialGap = player.potential - player.currentAbility;
    const canGrow = potentialGap > 5;
    const improvements: string[] = [];
    
    if (canGrow && baseGrowthRate > 0) {
      const actualGrowth = Math.round(baseGrowthRate * trainingIntensityMultiplier);
      
      const { updatedPlayer, changes } = this.applyTrainingFocusGrowth(
        player,
        actualGrowth,
        player.trainingFocus.primary,
        player.trainingFocus.secondary
      );
      
      const newCurrentAbility = Math.min(
        updatedPlayer.currentAbility,
        player.potential
      );
      
      await this.storage.updatePlayer(saveGameId, player.id, {
        attributes: updatedPlayer.attributes,
        currentAbility: newCurrentAbility,
      });
      
      return { improvements: changes };
    } else if (baseGrowthRate < 0) {
      const decline = Math.floor(Math.random() * 2);
      const declinedAttributes = this.applyAttributeDecline(player, decline);
      
      await this.storage.updatePlayer(saveGameId, player.id, declinedAttributes);
      improvements.push(`Overall ability declined by ${decline}`);
      
      return { improvements };
    }
    
    return { improvements: ["No significant changes"] };
  }

  private applyTrainingFocusGrowth(
    player: Player,
    totalGrowth: number,
    primaryFocus: string,
    secondaryFocus: string
  ): { updatedPlayer: Player; changes: string[] } {
    const changes: string[] = [];
    const updatedPlayer = { ...player, attributes: { ...player.attributes } };
    
    const focusMapping: Record<string, string[]> = {
      technical: ['passing', 'dribbling', 'shooting', 'ballControl'],
      physical: ['pace', 'stamina', 'strength', 'agility'],
      defensive: ['tackling', 'positioning', 'marking', 'interceptions'],
      mental: ['vision', 'decisionMaking', 'composure', 'workRate'],
    };
    
    const primaryGrowth = Math.round(totalGrowth * 0.7);
    const secondaryGrowth = Math.round(totalGrowth * 0.3);
    
    const primaryAttrs = focusMapping[primaryFocus] || ['passing'];
    const secondaryAttrs = focusMapping[secondaryFocus] || ['stamina'];
    
    primaryAttrs.forEach(attr => {
      const growth = Math.floor(primaryGrowth / primaryAttrs.length);
      const oldValue = updatedPlayer.attributes[attr as keyof PlayerAttributes] as number || 100;
      const newValue = Math.min(oldValue + growth, 200);
      (updatedPlayer.attributes as any)[attr] = newValue;
      if (growth > 0) {
        changes.push(`${attr.charAt(0).toUpperCase() + attr.slice(1)}: ${oldValue} → ${newValue} (+${growth})`);
      }
    });
    
    secondaryAttrs.forEach(attr => {
      if (!primaryAttrs.includes(attr)) {
        const growth = Math.floor(secondaryGrowth / secondaryAttrs.length);
        const oldValue = updatedPlayer.attributes[attr as keyof PlayerAttributes] as number || 100;
        const newValue = Math.min(oldValue + growth, 200);
        (updatedPlayer.attributes as any)[attr] = newValue;
      }
    });
    
    const attrs = updatedPlayer.attributes;
    const avgAbility = Math.round(
      (attrs.pace + attrs.shooting + attrs.passing + attrs.dribbling +
       attrs.tackling + attrs.stamina) / 6
    );
    updatedPlayer.currentAbility = avgAbility;
    
    return { updatedPlayer, changes };
  }

  private applyAttributeDecline(player: Player, decline: number): Partial<Player> {
    const attrs = player.attributes;
    return {
      attributes: {
        ...attrs,
        pace: Math.max(attrs.pace - decline, 50),
        shooting: Math.max(attrs.shooting - decline, 50),
        passing: Math.max(attrs.passing - decline, 50),
        dribbling: Math.max(attrs.dribbling - decline, 50),
        tackling: Math.max(attrs.tackling - decline, 50),
        stamina: Math.max(attrs.stamina - decline, 50),
      },
      currentAbility: Math.max(player.currentAbility - decline, 50),
    };
  }

  private async generateTrainingReport(
    saveGameId: number,
    reportDate: Date,
    trainingReport: Array<{ playerName: string; changes: string[] }>
  ): Promise<void> {
    const monthName = this.getMonthName(reportDate.getMonth() + 1);
    const year = reportDate.getFullYear();
    
    let reportBody = `Training Report for ${monthName} ${year}\n\n`;
    reportBody += `The following players have shown improvement this month:\n\n`;
    
    trainingReport.forEach(({ playerName, changes }) => {
      reportBody += `${playerName}:\n`;
      changes.forEach(change => {
        reportBody += `  • ${change}\n`;
      });
      reportBody += `\n`;
    });
    
    await this.storage.createInboxMessage(saveGameId, {
      category: "squad",
      subject: `Training Report - ${monthName} ${year}`,
      body: reportBody,
      from: "Coaching Staff",
      date: reportDate,
      read: false,
      starred: false,
      priority: "medium",
    });
  }

  private async processPlayerAging(saveGameId: number, gameState: GameState, newMonth: number): Promise<void> {
    if (newMonth === 7) {
      const allPlayers = await this.storage.getAllPlayers(saveGameId);
      
      for (const player of allPlayers) {
        await this.storage.updatePlayer(saveGameId, player.id, {
          age: player.age + 1,
        });
      }
    }
  }

  private async updateSeasonIfNeeded(saveGameId: number, gameState: GameState, newMonth: number, newYear: number): Promise<void> {
    if (newMonth === 7) {
      await this.storage.updateGameState(saveGameId, {
        season: newYear,
      });
      
      await this.storage.createInboxMessage(saveGameId, {
        category: "news",
        subject: `New Season ${newYear}/${newYear + 1}`,
        body: `Welcome to the new season!\n\nThe ${newYear}/${newYear + 1} season has begun. Good luck!`,
        from: "League Officials",
        date: new Date(gameState.currentDate),
        read: false,
        starred: false,
        priority: "high",
      });
    }
  }

  private getMonthName(month: number): string {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[month - 1];
  }

  async processMatchDay(saveGameId: number, matchId: number): Promise<void> {
    console.log(`Processing match day for match ${matchId}`);
  }

  /**
   * Get all matches scheduled on a specific date
   */
  async getMatchesOnDate(saveGameId: number, date: Date): Promise<any[]> {
    const allMatches = await this.storage.getAllMatches(saveGameId);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return allMatches.filter(match => {
      const matchDate = new Date(match.date);
      matchDate.setHours(0, 0, 0, 0);
      return matchDate.getTime() === targetDate.getTime() && !match.played;
    });
  }

  /**
   * Check if a match should show the preparation popup
   * Returns true if the match involves the player's team and hasn't been played
   */
  async shouldShowMatchPopup(saveGameId: number, matchId: number): Promise<boolean> {
    const match = await this.storage.getMatch(saveGameId, matchId);
    if (!match || match.played) {
      return false;
    }

    const gameState = await this.storage.getGameState(saveGameId);
    const isPlayerMatch = 
      match.homeTeamId === gameState.playerTeamId || 
      match.awayTeamId === gameState.playerTeamId;

    // Check if preparation status is pending or not set
    const needsPreparation = !match.preparationStatus || match.preparationStatus === "pending";

    return isPlayerMatch && needsPreparation;
  }

  /**
   * Get the next unplayed match involving the player's team
   * Returns null if no upcoming matches
   */
  async getNextUnplayedMatchForPlayer(saveGameId: number): Promise<any | null> {
    const gameState = await this.storage.getGameState(saveGameId);
    const competitions = await this.storage.getAllCompetitions(saveGameId);
    
    let upcomingMatches: any[] = [];

    // Collect all unplayed matches involving the player's team
    for (const competition of competitions) {
      if (!competition.teams.includes(gameState.playerTeamId)) continue;

      const playerMatches = competition.fixtures.filter(match =>
        !match.played &&
        (match.homeTeamId === gameState.playerTeamId || 
         match.awayTeamId === gameState.playerTeamId)
      );

      upcomingMatches = upcomingMatches.concat(
        playerMatches.map(match => ({
          ...match,
          competitionId: competition.id,
          competitionName: competition.name,
          competitionType: competition.type,
        }))
      );
    }

    // Sort by date (earliest first)
    upcomingMatches.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Return the next match that needs preparation
    const nextMatch = upcomingMatches.find(match => 
      !match.preparationStatus || match.preparationStatus === "pending"
    );

    return nextMatch || null;
  }

  /**
   * Get the next actionable event for the player
   * Returns the highest priority event that requires user action
   * Priority: 1 = Match, 2 = Training Completion, 3 = Contract Expiry, 4 = Month End, 5 = Season End
   */
  async getNextEvent(saveGameId: number): Promise<import("@shared/schema").NextEvent | null> {
    const gameState = await this.storage.getGameState(saveGameId);
    const currentDate = new Date(gameState.currentDate);
    
    // Get all potential events
    const events: import("@shared/schema").NextEvent[] = [];

    // 1. Check for next match (highest priority)
    const nextMatch = await this.getNextUnplayedMatchForPlayer(saveGameId);
    if (nextMatch) {
      const matchDate = new Date(nextMatch.date);
      const daysUntil = Math.ceil((matchDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      events.push({
        type: "match",
        date: nextMatch.date,
        daysUntil,
        description: `Match: ${nextMatch.homeTeamName || 'Home'} vs ${nextMatch.awayTeamName || 'Away'}`,
        priority: 1,
        details: {
          matchId: nextMatch.id,
          competitionId: nextMatch.competitionId,
          competitionName: nextMatch.competitionName,
          homeTeamId: nextMatch.homeTeamId,
          awayTeamId: nextMatch.awayTeamId,
        },
      });
    }

    // 2. Check for training completion (medium priority)
    // For now, training is processed automatically monthly, so we'll skip this
    // This can be implemented later if we add weekly training reports

    // 3. Check for contract expiries (low priority)
    const players = await this.storage.getPlayersByTeam(saveGameId, gameState.playerTeamId);
    for (const player of players) {
      // Check if contract expires within 6 months
      const contractEndDate = new Date(currentDate);
      contractEndDate.setMonth(contractEndDate.getMonth() + player.contract.length);
      
      const sixMonthsFromNow = new Date(currentDate);
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      
      if (contractEndDate <= sixMonthsFromNow) {
        const daysUntil = Math.ceil((contractEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        events.push({
          type: "contract_expiry",
          date: contractEndDate.toISOString(),
          daysUntil,
          description: `${player.name}'s contract expiring`,
          priority: 3,
          details: {
            playerId: player.id,
            playerName: player.name,
          },
        });
      }
    }

    // 4. Check for month end (financial processing)
    const nextMonthStart = new Date(currentDate);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
    nextMonthStart.setDate(1);
    
    const daysUntilMonthEnd = Math.ceil((nextMonthStart.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    events.push({
      type: "month_end",
      date: nextMonthStart.toISOString(),
      daysUntil: daysUntilMonthEnd,
      description: "End of month - Financial report",
      priority: 4,
      details: {
        month: nextMonthStart.getMonth() + 1,
        year: nextMonthStart.getFullYear(),
      },
    });

    // 5. Check for season end (typically May/June - assume June 30th)
    const seasonEndDate = new Date(currentDate.getFullYear(), 5, 30); // June 30th
    
    // If we're past June, check next year
    if (currentDate > seasonEndDate) {
      seasonEndDate.setFullYear(seasonEndDate.getFullYear() + 1);
    }
    
    if (currentDate < seasonEndDate) {
      const daysUntilSeasonEnd = Math.ceil((seasonEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      events.push({
        type: "season_end",
        date: seasonEndDate.toISOString(),
        daysUntil: daysUntilSeasonEnd,
        description: "End of season",
        priority: 5,
        details: {
          season: gameState.season,
        },
      });
    }

    // Sort by priority (lowest number = highest priority), then by days until
    events.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.daysUntil - b.daysUntil;
    });

    // Return the highest priority event
    return events[0] || null;
  }

  /**
   * Get all events within a date range
   * Used to show what will happen during time advancement
   */
  async getEventsInRange(
    saveGameId: number,
    startDate: string,
    endDate: string
  ): Promise<import("@shared/schema").GameEvent[]> {
    const gameState = await this.storage.getGameState(saveGameId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const events: import("@shared/schema").GameEvent[] = [];
    let eventIdCounter = 0;

    // Get all matches in range
    const competitions = await this.storage.getAllCompetitions(saveGameId);
    for (const competition of competitions) {
      const matchesInRange = competition.fixtures.filter(match => {
        const matchDate = new Date(match.date);
        return (
          matchDate >= start &&
          matchDate <= end &&
          !match.played &&
          (match.homeTeamId === gameState.playerTeamId || 
           match.awayTeamId === gameState.playerTeamId)
        );
      });

      for (const match of matchesInRange) {
        events.push({
          id: `match-${eventIdCounter++}`,
          type: "match",
          date: match.date.toISOString(),
          description: `Match in ${competition.name}`,
          priority: 1,
          processed: false,
          details: {
            matchId: match.id,
            competitionId: competition.id,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
          },
        });
      }
    }

    // Add month boundaries in range
    let currentMonth = new Date(start);
    currentMonth.setDate(1);
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    
    while (currentMonth <= end) {
      events.push({
        id: `month-end-${eventIdCounter++}`,
        type: "month_end",
        date: currentMonth.toISOString(),
        description: `Monthly report - ${this.getMonthName(currentMonth.getMonth() + 1)}`,
        priority: 4,
        processed: false,
        details: {
          month: currentMonth.getMonth() + 1,
          year: currentMonth.getFullYear(),
        },
      });
      
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Sort by date
    events.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return events;
  }
}

