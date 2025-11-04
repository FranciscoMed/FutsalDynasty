import type { IStorage } from "./storage";
import type { GameState, Player } from "@shared/schema";

export class GameEngine {
  constructor(private storage: IStorage) {}

  async advanceOneDay(): Promise<GameState> {
    const gameState = await this.storage.getGameState();
    const currentDate = new Date(gameState.currentDate);
    
    currentDate.setDate(currentDate.getDate() + 1);
    
    const newMonth = currentDate.getMonth() + 1;
    const oldMonth = gameState.currentMonth;
    
    const monthChanged = newMonth !== oldMonth;
    
    if (monthChanged) {
      await this.processMonthlyEvents(gameState, currentDate);
    }
    
    const updatedState = await this.storage.updateGameState({
      currentDate,
      currentMonth: newMonth,
    });
    
    return updatedState;
  }

  async advanceDays(days: number): Promise<GameState> {
    let currentState = await this.storage.getGameState();
    
    for (let i = 0; i < days; i++) {
      currentState = await this.advanceOneDay();
    }
    
    return currentState;
  }

  async advanceToDate(targetDate: Date): Promise<GameState> {
    const gameState = await this.storage.getGameState();
    const currentDate = new Date(gameState.currentDate);
    const target = new Date(targetDate);
    
    while (currentDate < target) {
      await this.advanceOneDay();
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return await this.storage.getGameState();
  }

  private async processMonthlyEvents(gameState: GameState, newDate: Date): Promise<void> {
    const newMonth = newDate.getMonth() + 1;
    const newYear = newDate.getFullYear();
    
    console.log(`Processing monthly events for month ${newMonth}/${newYear}`);
    
    await this.processMonthlyPayments(gameState);
    
    await this.processPlayerDevelopment(gameState);
    
    await this.processPlayerAging(gameState, newMonth);
    
    await this.updateSeasonIfNeeded(gameState, newMonth, newYear);
    
    await this.storage.createInboxMessage({
      category: "news",
      subject: `Monthly Report - ${this.getMonthName(newMonth)} ${newYear}`,
      body: `Your monthly report for ${this.getMonthName(newMonth)} is ready.\n\nKey highlights:\n- Player development continues\n- Wages have been paid\n- Check your finances for detailed breakdown`,
      from: "Club Secretary",
      date: newDate,
      read: false,
      starred: false,
      priority: "medium",
    });
    
    await this.storage.updateGameState({
      lastTrainingReportMonth: newMonth,
    });
  }

  private async processMonthlyPayments(gameState: GameState): Promise<void> {
    const players = await this.storage.getPlayersByTeam(gameState.playerTeamId);
    const totalWages = players.reduce((sum, p) => sum + p.contract.salary, 0);
    
    const club = await this.storage.getClub();
    if (club) {
      await this.storage.updateClub({
        budget: club.budget - totalWages,
      });
      
      await this.storage.createFinancialTransaction({
        date: new Date(gameState.currentDate),
        type: "expense",
        category: "wage",
        amount: totalWages,
        description: `Monthly wages payment for ${players.length} players`,
      });
    }
  }

  private async processPlayerDevelopment(gameState: GameState): Promise<void> {
    const players = await this.storage.getPlayersByTeam(gameState.playerTeamId);
    
    for (const player of players) {
      await this.developPlayer(player);
    }
  }

  private async developPlayer(player: Player): Promise<void> {
    const age = player.age;
    let growthRate = 0;
    
    if (age <= 21) {
      growthRate = 0.015;
    } else if (age <= 26) {
      growthRate = 0.005;
    } else if (age <= 29) {
      growthRate = 0;
    } else if (age <= 32) {
      growthRate = -0.005;
    } else {
      growthRate = -0.015;
    }
    
    const trainingIntensityMultiplier = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
    }[player.trainingFocus.intensity];
    
    const potentialGap = player.potential - player.currentAbility;
    const canGrow = potentialGap > 5;
    
    if (canGrow && growthRate > 0) {
      const actualGrowth = growthRate * trainingIntensityMultiplier;
      const improvement = Math.floor(Math.random() * 3) + 1;
      
      const newCurrentAbility = Math.min(
        player.currentAbility + improvement,
        player.potential
      );
      
      await this.storage.updatePlayer(player.id, {
        currentAbility: newCurrentAbility,
      });
    } else if (growthRate < 0) {
      const decline = Math.floor(Math.random() * 2);
      
      await this.storage.updatePlayer(player.id, {
        currentAbility: Math.max(player.currentAbility - decline, 50),
      });
    }
  }

  private async processPlayerAging(gameState: GameState, newMonth: number): Promise<void> {
    if (newMonth === 7) {
      const allPlayers = await this.storage.getAllPlayers();
      
      for (const player of allPlayers) {
        await this.storage.updatePlayer(player.id, {
          age: player.age + 1,
        });
      }
    }
  }

  private async updateSeasonIfNeeded(gameState: GameState, newMonth: number, newYear: number): Promise<void> {
    if (newMonth === 7) {
      await this.storage.updateGameState({
        season: newYear,
      });
      
      await this.storage.createInboxMessage({
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

  async processMatchDay(matchId: number): Promise<void> {
    console.log(`Processing match day for match ${matchId}`);
  }
}

