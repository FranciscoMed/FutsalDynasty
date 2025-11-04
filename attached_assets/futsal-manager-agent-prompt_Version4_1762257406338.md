# Futsal Manager - Complete Game Development Prompt

## Project Overview
Create a complete futsal manager simulation game where players manage a futsal team through transfers, tactics, training, and competitions. The game should be dashboard-based with a clean, intuitive UI and modular architecture.

## Core Game Modules

### 1. Player Management Module
**Requirements:**
- **Player Attributes System (IMPORTANT):**
  - **Internal Scale:** All player attributes are stored and calculated on a 0-200 scale for fine-grained progression
  - **Display Scale:** Attributes are displayed to the user on a 0-20 scale as **WHOLE NUMBERS ONLY** (divide internal value by 10 and round)
  - **Rounding:** Display values should be rounded to nearest whole number (e.g., 174 internal = 17 display, 165 = 17, 164 = 16)
  - **Benefit:** Players can improve gradually (e.g., +2-5 internal points per training) without showing immediate visible changes, making progression feel realistic and rewarding when displayed rating increases over the month
  
- **Player Attributes:**
  - Position: Goalkeeper, Defender, Winger, Pivot
  - Overall rating: Calculated from individual attributes (displayed 0-20, stored 0-200)
  - Individual skills (all stored 0-200, displayed 0-20 as whole numbers):
    - **Technical:** Shooting, Passing, Dribbling, Ball Control, First Touch
    - **Physical:** Pace, Stamina, Strength, Agility
    - **Defensive:** Tackling, Positioning, Marking, Interceptions
    - **Mental:** Vision, Decision Making, Composure, Work Rate
    - **Goalkeeper-specific:** Reflexes, Handling, Positioning, Distribution
  - Age (affects growth/decline)
  - Potential (stored 0-200): Maximum rating a player can reach
  - Current Ability (stored 0-200): Current overall rating
  - Form (1-10): Recent performance trend
  - Morale (1-10): Happiness/satisfaction
  - Fitness (0-100%): Current physical condition
  - Condition (0-100%): Match sharpness

- **Overall Rating Calculation:**
  - Weighted average of relevant attributes based on position
  - Example for Pivot: (Passing×3 + Vision×2 + Ball Control×2 + Shooting×2 + Stamina×1.5 + Decision Making×1.5) / 12
  - Example for Goalkeeper: (Reflexes×3 + Positioning×2.5 + Handling×2.5 + Distribution×1 + Composure×1) / 10
  - Calculate on 0-200 scale, display on 0-20 scale as whole number
  
- **Player Development System:**
  - Training increases attributes by 2-8 internal points per session
  - **Monthly accumulation:** 8-32 internal points per month per focused attribute (4 weeks of training)
  - Age curves affect development speed:
    - 16-21: Fast growth (+6-10 per training session, 24-40 per month)
    - 22-25: Moderate growth (+4-7 per training session, 16-28 per month)
    - 26-29: Slow growth (+2-5 per training session, 8-20 per month)
    - 30-32: Minimal growth (+1-3 per training session, 4-12 per month)
    - 33+: Decline begins (-1 to +2 per training session, -4 to +8 per month)
  - Players can only develop up to their potential rating
  - Playing time accelerates development (+20% bonus to training gains)
  - Position-specific training focuses on relevant attributes

- Player market/transfer system for buying and selling players
- Contract management (salary, contract length, release clauses)
- Player morale and fitness tracking
- Injury system with recovery times
- Player search and filtering capabilities
- **Player growth notifications:** Monthly reports showing which players improved displayed rating

### 2. Squad Management Module
**Requirements:**
- Starting lineup selection (5 players: 1 GK, 4 outfield)
- Substitute bench configuration
- Formation/tactical system with predefined formations (2-2, 3-1, 4-0, 1-2-1, etc.)
- Position assignment and role customization
- Squad depth chart visualization
- Automatic squad validation (minimum players, position requirements)
- Display all player ratings on 0-20 scale as whole numbers in squad view
- Show attribute bars/graphs using displayed scale (0-20)

### 3. Tactics Module
**Requirements:**
- Tactical presets: Defensive, Balanced, Attacking
- Custom tactical instructions:
  - Playing style (possession, counter-attack, direct)
  - Defensive line (deep, normal, high)
  - Pressing intensity (low, medium, high)
  - Width (narrow, normal, wide)
  - Tempo (slow, normal, fast)
- Opposition-specific tactics
- In-game tactical adjustments
- Set-piece strategies (corners, free-kicks)

### 4. Training Module
**Requirements:**
- **Training Philosophy: Medium-term progression (monthly results)**
  - Training sessions happen throughout the month
  - Players accumulate small internal improvements each session
  - **Monthly Training Reports** show accumulated visible improvements
  - Users plan training focus for the month, see results at month-end

- **Individual Training:**
  - Focus areas per player (technical, physical, tactical, mental)
  - Specialized position training
  - Skill-specific drills (targets specific attributes on 0-200 scale)
  - Training intensity management:
    - Low intensity: +2-4 internal points per session, low injury risk
    - Medium intensity: +4-6 internal points per session, moderate injury risk
    - High intensity: +6-10 internal points per session, higher injury risk
  - **Monthly accumulation:** 8-40 internal points per attribute depending on age, intensity, and focus
  
- **Team Training:**
  - Team chemistry development
  - Tactical cohesion training
  - Match preparation sessions
  - Friendly matches for practice
  
- **Training Schedule:**
  - Set monthly training focus for each player
  - Can adjust training plan mid-month if needed
  - Training facilities level affects training effectiveness multiplier
  
- **Monthly Progress Tracking:**
  - **End of month: Detailed training report** showing which players improved
  - Report shows: "Rodriguez: Passing 14 → 16 (+2), Shooting 11 → 12 (+1)"
  - Progress bars show how close players are to next improvement
  - Young players with good training focus can gain 2-4 displayed points per month in focused attributes
  - Older players might gain 0-1 displayed points per month
  
- **Player Potential System:**
  - Young players (16-21) have hidden potential ratings (0-200)
  - Scouting reports show potential as stars or descriptions:
    - 180-200: "World Class Potential" (⭐⭐⭐⭐⭐)
    - 160-179: "Elite Potential" (⭐⭐⭐⭐)
    - 140-159: "Good Potential" (⭐⭐⭐)
    - 120-139: "Decent Potential" (⭐⭐)
    - 100-119: "Limited Potential" (⭐)

### 5. Match Simulation Module
**Requirements:**
- **Real-time Match Engine:**
  - Minute-by-minute simulation with text commentary
  - Visual representation (simple 2D pitch view or text-based)
  - Live score updates
  - Key events: goals, assists, yellow/red cards, substitutions, injuries
  - Match statistics: possession, shots, passes, tackles, saves
  - Ability to pause and make tactical changes/substitutions
  - Match speed controls (normal, fast, instant)
  
- **Match outcome factors:**
  - Team overall rating (uses internal 0-200 scale for calculations)
  - Individual player ratings (internal scale) affect their match performance
  - Tactical setup and matchups
  - Player form and morale
  - Home advantage
  - Randomness factor for realism
  
- **Match Performance:**
  - Player match ratings calculated on 0-100 scale internally, displayed as 1-10
  - Match performance affects form (which affects future matches)
  - Good performances give small attribute boosts (+1-3 internal points)
  - Match experience counts toward monthly development
  
- Match reports with detailed statistics and ratings (1-10 for each player)
- Match history and archive

### 6. Competition Management Module
**Requirements:**
- **Competition Types:**
  - League (round-robin format)
  - Cup (knockout format with draws)
  - Continental competitions (Champions League style)
  - Super Cup
  
- **Competition Rules Engine:**
  - Customizable team count per competition (e.g., 12-20 teams for league)
  - Promotion/relegation system (e.g., top 2 promoted, bottom 2 relegated)
  - European competition qualification spots (e.g., top 4 qualify)
  - Squad registration rules:
    - Maximum squad size (e.g., 15 players)
    - Homegrown player requirements
    - Registration windows (summer, winter)
  - Suspension system:
    - Yellow card accumulation (e.g., 5 yellows = 1 match ban)
    - Red card bans (1-3 matches depending on severity)
    - Appeals system
    
- **League Tables:**
  - Points, played, won, drawn, lost, goals for/against, goal difference
  - Form guide (last 5 matches)
  - Head-to-head records
  
- **Fixtures:**
  - Automatic fixture generation
  - Calendar view with all competitions
  - Fixture congestion management
  
- **Competition Simulation:**
  - Simulate other matches in competitions automatically (uses internal 0-200 ratings)
  - View results and updated standings after each matchday
  - Realistic AI team behavior

### 7. Financial Management Module
**Requirements:**
- Club budget tracking
- Revenue sources: match day, prize money, transfers, sponsorships
- Expenses: wages, transfers, facilities, staff
- Financial sustainability rules (can't spend beyond budget)
- Sponsorship deals with varying terms
- Season-end financial reports
- **Player values:** Calculated based on internal ratings but displayed values are sensible (not directly showing 0-200 scale)

### 8. Club Management Module
**Requirements:**
- Club information: name, stadium, reputation, history
- Staff management: assistant coach, fitness coach, scout (affect training and player discovery)
- Facility upgrades: training ground, stadium, youth academy
- Board expectations and objectives (e.g., "Finish top 6", "Win cup")
- Club reputation system affecting transfers and finances

### 9. Inbox & Notification Module
**Requirements:**
- **Inbox/Email System:**
  - Clean email-style interface with list view and detail view
  - Email categories with visual indicators:
    - 🔴 Urgent (contract expiring, injury crisis, board warning)
    - 📅 Match Notifications (upcoming fixtures, match reports)
    - 💰 Financial (transfer offers, wage demands, sponsorship deals)
    - 👥 Squad (player morale issues, training feedback, player milestones)
    - 🏆 Competition (cup draws, qualification announcements, league updates)
    - 📰 General News (club news, league news, awards)
  - Read/unread status with badge counter
  - Archive and delete functionality
  - Filter by category and date
  - Search inbox functionality
  - Quick actions from inbox (e.g., respond to transfer offer, set lineup for match)

- **Email Types & Content:**
  - **Pre-Match Reminders:** "Your match against [Team] is in 2 days" (with link to set tactics)
  - **Match Reports:** Detailed post-match summary from assistant coach with performance analysis
  - **Monthly Training Reports:** Comprehensive report showing all player improvements over the past month
  - **Transfer Offers:** Incoming bids for your players, AI teams interested in your listed players
  - **Transfer Opportunities:** Scout recommendations, players available in market
  - **Contract Negotiations:** Player contract demands, renewal requests, contract expiring warnings (90, 30, 7 days)
  - **Player Issues:** Morale complaints ("I'm not getting enough playing time"), injury updates, discipline issues
  - **Board Communications:** Objective reminders, performance reviews, budget updates, board satisfaction
  - **Competition Updates:** Cup draw results, league standings updates, qualification announcements
  - **Achievements:** Player milestones (100th goal, 50 appearances), team records, awards won
  - **Financial Notifications:** Sponsorship offers, wage budget warnings, transfer budget updates
  - **Staff Reports:** Fitness coach injury reports, scout player recommendations, assistant tactical suggestions
  - **League News:** Rival results, manager sackings, major transfers in league, rule changes
  - **Suspension Alerts:** Players suspended, appeals results, return from suspension
  - **Monthly Development Summary:** "This Month's Development - 5 players improved!"

- **Notification System:**
  - **In-game notification banner:** Small popup for urgent/important events
  - **Notification center:** Bell icon with badge counter showing unread notifications
  - **Desktop notifications (optional):** Browser notifications for critical events when game is in background
  - **Notification types:**
    - Red (Critical): Injuries during match, red cards, board ultimatum, financial crisis
    - Yellow (Important): Match in 24 hours, contract expiring soon, transfer deadline approaching
    - Blue (Info): Match results, general news
    - Green (Positive): Match won, player milestone, trophy won, objective completed, **monthly training report available**

- **Smart Notification Triggers:**
  - 48 hours before match → "Match reminder: prepare tactics"
  - 24 hours before match → "Match tomorrow: confirm lineup"
  - After match simulation → "Match report available"
  - **End of each month → "Monthly Training Report Available"**
  - **End of month → "Training Report: [X] players improved this month!"**
  - Player contract < 6 months → "Contract expiring warning"
  - Player morale drops below threshold → "Player unhappy notification"
  - Transfer window opens → "Transfer window now open"
  - 7 days before transfer deadline → "Transfer deadline approaching"
  - When you receive transfer offer → "New transfer offer"
  - When player injured → "Injury report"
  - When suspended player available → "Player returns from suspension"
  - Season end → "Season review report"
  - Board objective review dates → "Performance review from board"

- **Actionable Emails:**
  - Direct links/buttons within emails to relevant screens:
    - "View Squad" → Navigate to squad screen
    - "Respond to Offer" → Open transfer negotiation modal
    - "Set Tactics" → Open tactics screen for specific match
    - "Renew Contract" → Open contract negotiation with player
    - "Read Full Report" → Open detailed statistics page
    - "View Training Progress" → Open player development screen
  - Option to mark emails as important/starred
  - Auto-archive old emails after X days (configurable)

- **Email Timestamps:**
  - Show relative time (e.g., "2 hours ago", "Yesterday", "3 days ago")
  - Display exact date/time on hover
  - Group emails by date in inbox

- **User Experience:**
  - Notification badge on inbox icon in navigation (shows unread count)
  - Sound effects for new important emails (toggleable)
  - Visual highlight for unread emails (bold text, colored background)
  - Quick preview of email content in list view
  - Batch operations (select multiple, mark all as read, delete selected)
  - Keyboard shortcuts (N for next, P for previous, D for delete, A for archive)

### 10. Career/Season Management Module
**Requirements:**
- Save/load game functionality
- Season progression (summer/winter breaks)
- Calendar system with important dates
- **Monthly cycle:** Matches throughout month, training report at month-end
- News feed with game events and updates (feeds into inbox)
- Career statistics and achievements
- Multiple save slots

## Technical Requirements

### Frontend (Dashboard UI)
**Technology suggestions:** React, Vue, or Svelte
**Design requirements:**
- Clean, modern, responsive dashboard layout
- Navigation sidebar with module icons
- **Notification bell icon with badge counter in header**
- **Inbox icon with unread count in navigation sidebar**
- Color-coded information (green=positive, red=negative, etc.)
- Modal dialogs for detailed views
- Data tables with sorting and filtering
- Charts for statistics (line graphs, bar charts)
- **Attribute displays:** All player ratings shown on 0-20 scale as **WHOLE NUMBERS** with progress bars
- **Hidden internal calculations:** All backend calculations use 0-200 scale
- Mobile-friendly responsive design
- Dark/light theme toggle
- Toast notifications for real-time events

**Key Dashboard Screens:**
1. Home/Overview: upcoming fixtures, latest inbox messages (top 5), key stats, days until monthly training report
2. **Inbox:** Full email interface with categories, filters, and search
3. Squad: player list with stats (0-20 whole numbers) and management options
4. Tactics: formation selector and tactical settings
5. **Training:** Monthly training plan, current focus areas, progress indicators
6. Transfers: market, shortlist, negotiations (show ratings 0-20)
7. Competitions: tables, fixtures, results
8. Match: live simulation interface
9. Finances: budget overview and transactions
10. Club: facilities, staff, objectives
11. **Player Profile:** Detailed view showing all attributes (0-20 whole numbers), form, morale, potential stars, contract, history, development history
12. **Player Development Screen:** Shows monthly progress for all players

### Backend/Game Engine
**Technology suggestions:** Node.js, Python, or suitable game engine
**Requirements:**
- Modular architecture with separate modules for each game system
- Game state management (save/load system)
- **Attribute System:**
  - Store all player attributes on 0-200 scale in database
  - Create conversion functions: `internalToDisplay(value)` returns whole number 0-20
  - All calculations use internal scale (0-200)
  - All UI displays use display scale (0-20, whole numbers)
  - Track monthly attribute changes for training reports
- **Monthly Training Processor:**
  - Accumulates training gains throughout month
  - Generates comprehensive report at month-end
  - Calculates which players had visible improvements
- Match simulation algorithm (uses internal 0-200 ratings)
- Player growth/decline algorithms (modify internal 0-200 values)
- AI for opponent teams (transfers, tactics, substitutions)
- Random event generation (injuries, form changes)
- **Event/notification queue system** for generating and managing game events
- **Email template engine** for dynamic email content generation
- Database schema for all game entities
- RESTful API or state management for frontend-backend communication

### Data Structure
**Core Entities:**
- **Player:**
  ```javascript
  {
    id: number,
    name: string,
    age: number,
    position: string,
    // All attributes stored 0-200 internally
    attributes: {
      shooting: number,      // 0-200
      passing: number,       // 0-200
      dribbling: number,     // 0-200
      ballControl: number,   // 0-200
      pace: number,          // 0-200
      stamina: number,       // 0-200
      // ... all other attributes 0-200
    },
    potential: number,       // 0-200
    currentAbility: number,  // 0-200 (calculated overall)
    form: number,            // 1-10
    morale: number,          // 1-10
    fitness: number,         // 0-100
    contract: {...},
    history: {...},
    monthlyTrainingFocus: {
      primary: string,       // e.g., "shooting"
      secondary: string,     // e.g., "passing"
      intensity: string      // "low", "medium", "high"
    }
  }
  ```
- Team (squad, finances, facilities, reputation)
- Competition (rules, fixtures, standings)
- Match (events, statistics, result)
- Transfer (offers, negotiations, history)
- **Monthly Training Cycle** (start_date, end_date, players_data, accumulated_gains)
- **Email/Message** (id, category, subject, body, timestamp, read_status, starred, priority)
- **Notification** (id, type, message, timestamp, read_status, action_link)

### Database
**Suggested approach:** SQLite for local storage, or JSON files for simplicity
**Tables needed:**
- **players** (with all attributes as 0-200 integers)
- teams
- competitions
- fixtures
- matches
- transfers
- **monthly_training_cycles** (track each month's training period)
- **training_gains_log** (track monthly attribute changes)
- club_finances
- game_state
- **inbox_messages**
- **notifications**
- **notification_preferences**
- **player_development_history** (monthly snapshots for tracking growth over time)

## Game Balance & Realism

### Player Ratings
- **Internal Scale:** 0-200 for all attributes and overall rating
- **Display Scale:** 0-20 as **WHOLE NUMBERS** (divide internal by 10 and round)
- **Conversion:** 174 internal → 17 display, 165 internal → 17 display (16.5 rounds to 17), 164 → 16
- **Overall rating calculation:** Weighted average based on position, calculated on 0-200 scale
- **Age curves (monthly gains):** 
  - 16-21: Peak development years (can gain 24-40 internal points per month in focused attribute)
  - 22-25: Good development (16-28 points per month)
  - 26-29: Maintenance phase (8-20 points per month)
  - 30-32: Slow decline (4-12 points per month)
  - 33+: Clear decline (-4 to +8 points per month)
- **Potential:** Hidden ceiling (0-200) that limits how high attributes can grow
- **Monthly Training Impact Examples:**
  - A 17-year-old Pivot with 140 passing (14 display) trains passing intensely for 1 month
  - Gains: 30 internal points (average high-intensity young player)
  - New value: 170 (17 display)
  - User sees improvement from 14 → 17 in monthly report (+3 visible improvement)
  
  - A 28-year-old Winger with 165 shooting (17 display) trains shooting for 1 month
  - Gains: 12 internal points (moderate intensity, older player)
  - New value: 177 (18 display)
  - User sees improvement from 17 → 18 in monthly report (+1 visible improvement)

### Match Simulation Balance
- Better team should win 60-70% of the time (not 100% for realism)
- **Match engine uses internal 0-200 ratings** for all calculations
- Tactics should have meaningful impact (5-10% win probability swing)
- Home advantage: approximately +5% win probability
- Player form and morale affect performance:
  - Form 1-3: -15 to -5 internal points
  - Form 4-7: -5 to +5 internal points
  - Form 8-10: +5 to +15 internal points
- **Match performance contributes to monthly development** (+1-4 internal points per good match)

### Economic Balance
- Starting budget: moderate (allows 2-3 signings)
- Wage structure: 40-60% of budget
- **Transfer market:** 
  - Player values calculated from internal overall rating (0-200)
  - Rough formula: Value = (CurrentAbility / 2) × AgeModifier × PotentialModifier × 10000
  - Display sensible values like $50K - $5M depending on rating
- Prize money should be meaningful but not break the game

### Notification Balance
- Not too many notifications (avoid spam)
- **Monthly training reports reduce notification frequency** compared to weekly
- Prioritize important events over minor ones
- Allow user to customize notification preferences
- Monthly reports are exciting and anticipated events

### Training Balance
- **Monthly progression feels substantial but not overpowered**
- Young players can realistically gain 2-4 displayed points per month in focused attributes
- Older players gain 0-1 displayed points per month
- Unfocused attributes may improve 0-1 displayed points from general training and matches
- **Players need 3-6 months of focused training to make major improvements**
- A 16-year-old with rating 12 could reach rating 18-19 over 2-3 seasons with proper training

## Initial Game Setup
- Player chooses or creates a club
- Select difficulty level (affects starting budget, expectations, AI strength)
- Initial squad generation (15 players with varied internal ratings 80-160, displayed 8-16)
- Starting budget allocation
- First season competition registration
- **Welcome email from board with objectives and introduction**
- **Set initial monthly training plan**

## Progressive Features (MVP vs. Full Game)

### MVP (Minimum Viable Product):
1. Basic player database with dual-scale system (0-200 internal, 0-20 display as whole numbers)
2. Squad selection showing displayed ratings
3. Simple match simulation using internal ratings (instant results with basic stats)
4. One league competition with standings
5. Basic transfers (buy/sell with simple negotiation)
6. Simple UI dashboard with key screens
7. **Basic inbox with match notifications and transfer alerts**
8. **Monthly training system with end-of-month reports**

### Full Game (All features):
- Everything in MVP plus:
- Real-time match simulation with commentary
- Complete training system with monthly comprehensive reports
- Multiple competitions with all rules
- Advanced tactics
- Financial management
- Staff and facilities (affect training multipliers)
- **Full inbox system with all email types and categories**
- **Comprehensive notification system with preferences**
- **Actionable emails with direct links**
- **Player development tracking with monthly history graphs**
- Career mode with multiple seasons
- Comprehensive statistics and history
- Player comparison tools (side-by-side attribute comparison)

## Development Approach
1. Start with core data models (Player with dual-scale attributes, Team, Match, Email, Notification)
2. **Implement attribute conversion system (0-200 → 0-20 whole numbers)**
3. Build basic UI dashboard structure with inbox icon
4. Implement squad management (display 0-20 scale, whole numbers)
5. Create simple match simulation (calculate with 0-200 scale)
6. **Add monthly training cycle system**
7. **Add basic notification system (match reminders, results, monthly training reports)**
8. Add competition management
9. Implement transfers and finances
10. **Expand inbox with transfer and financial emails**
11. **Complete monthly training report generation**
12. Enhance match simulation to real-time
13. Add advanced features (tactics, staff, facilities)
14. **Complete full inbox system with all email types**
15. **Add player development history tracking (monthly snapshots)**
16. Polish UI and add quality-of-life features
17. Testing and balancing (especially monthly attribute growth rates)

## Code Quality Requirements
- Clean, modular code with clear separation of concerns
- **Attribute conversion functions centralized and reusable:**
  ```javascript
  function internalToDisplay(value) {
    return Math.round(value / 10); // e.g., 174 → 17, 165 → 17, 164 → 16
  }
  
  function displayToInternal(value) {
    return value * 10; // e.g., 17 → 170
  }
  
  function hasDisplayedValueChanged(oldInternal, newInternal) {
    return internalToDisplay(oldInternal) !== internalToDisplay(newInternal);
  }
  
  // Monthly training processor
  function processMonthlyTraining(player, trainingFocus, matchesPlayed) {
    // Accumulate gains from training sessions + match experience
    // Return object with old and new displayed values for each attribute
  }
  ```
- Comments explaining complex game logic (especially attribute calculations and monthly processing)
- Reusable components for UI elements (email template component, notification component, attribute display component)
- **Configuration files for game balance variables** (monthly training gains, age curve modifiers, attribute weights)
- **Notification/email factory pattern** for generating different message types
- Error handling and input validation
- Efficient algorithms for match simulation (should run smoothly)
- **Unit tests for attribute conversion and monthly training calculations**

## Additional Polish
- Sound effects for key events (goals, cards, whistle, **new email notification, monthly report available "ding"**)
- Animations for UI transitions (**email slide-in, notification pop-up, progress bar filling, monthly report reveal**)
- Tooltips explaining game mechanics (especially that ratings are out of 20)
- Tutorial or help section for new players
- Keyboard shortcuts for power users
- Auto-save functionality (especially at month-end after processing training)
- Export career statistics
- **Email notification sound toggle**
- **Notification preference customization (which events to notify about)**
- **"Player Development" screen showing monthly progress:**
  - Month-by-month attribute history graphs
  - Compare current month vs. previous months
  - Projected development based on current training plan
  - Motivates strategic training planning

## Sample Game Flow
1. User starts new game, selects/creates club
2. **Receives welcome email from board with objectives**
3. Views initial squad (sees ratings 8-16 whole numbers)
4. Makes transfer market signings (optional)
5. **Sets monthly training plan for each player (choose focus areas and intensity)**
6. **Receives notification: "Match in 2 days - prepare your tactics"**
7. Sets starting lineup and tactics
8. Simulates matches throughout the month (4-6 matches typically)
9. **Receives email: "Match Report" after each match with performance analysis**
10. Reviews match reports and player ratings (1-10 display)
11. Mid-month: Can adjust training plan if needed based on injuries or form
12. **End of month arrives → Automatic monthly training processing**
13. **Receives email: "Monthly Training Report - 7 Players Improved!" 🎉**
14. Opens report: "Rodriguez: Passing 14 → 16 (+2), Shooting 11 → 12 (+1)"
15. **Receives email: "Silva has made excellent progress this month! Dribbling 13 → 15"**
16. Plans next month's training based on results
17. **Receives email: "Transfer Offer - [Club] interested in [Player]"**
18. Manages transfers and responds to offers
19. Continues season with monthly training cycles
20. After 3-4 months, young prospects show significant visible growth (2-3 overall rating points)
21. **End of season receives email: "Season Review - Performance Report from Board"**
22. Reviews full season development (sees players who improved from 12→15, 14→17, etc.)
23. Summer transfer window and new season preparation
24. Continues career watching players develop month by month

---

## Attribute System Examples

### Example 1: Young Prospect Monthly Development
**Player:** 18-year-old Pivot  
**Starting Attributes (Internal → Display):**
- Passing: 120 → 12
- Vision: 100 → 10
- Shooting: 90 → 9
- Potential: 180 (can reach 18)

**Monthly Training Plan:** Focus on Passing (primary) and Vision (secondary), High Intensity

**After 1 Month (4 training weeks + 4 matches):**
- Passing: 120 + 32 (training) + 4 (match experience) = 156 → 16 ✅ **+4 visible improvement!**
- Vision: 100 + 20 (secondary training) + 2 (matches) = 122 → 12 ✅ **+2 visible improvement!**
- Shooting: 90 + 5 (general training) + 2 (matches) = 97 → 10 ✅ **+1 visible improvement!**

**Monthly Report Email:**
```
🎉 Excellent Progress for Rodriguez!

This month's improvements:
✅ Passing: 12 → 16 (+4) - Outstanding!
✅ Vision: 10 → 12 (+2) - Great progress!
✅ Shooting: 9 → 10 (+1) - Showing improvement

Rodriguez is developing into a quality midfielder. Keep up the focused training!
```

**After 6 Months of similar training:**
- Passing: 156 + (30×6) = 336 capped at potential subset → ~175 → 18
- Overall development: 12 → 15-16 overall rating
- User feels extremely satisfied watching consistent monthly improvements

### Example 2: Experienced Player Monthly Development
**Player:** 27-year-old Winger with 165 Shooting (17 display)  
**Monthly Training Plan:** Focus on Shooting, Medium Intensity

**After 1 Month:**
- Shooting: 165 + 15 (training) + 3 (matches) = 183 → 18 ✅ **+1 visible improvement**

**Monthly Report Email:**
```
Silva continues to refine his skills:
✅ Shooting: 17 → 18 (+1)

At his age, Silva is still improving. His shooting is now elite level!
```

### Example 3: Veteran Decline Monthly
**Player:** 34-year-old Goalkeeper with 170 Reflexes (17 display)  
**Each month:** -2 internal points due to age, +8 from maintenance training

**After 3 months:**
- Reflexes: 170 + 6 + 6 + 6 = 188 (slight improvement) → 19 (went up!)
- After 6 more months: 188 + 0 + 0 - 6 - 6 - 6 - 6 = 164 → 16 (declined)

**Shows realistic veteran curve:** Can maintain or even improve briefly, then gradual decline

### Example 4: No Training Focus
**Player:** Squad player who doesn't get focused training
**Monthly gains:** +5 from general team training, +2 from occasional matches

**After 1 month:**
- Dribbling: 145 + 7 = 152 (15.2 → 15) - No visible change
- After 2 months: 152 + 7 = 159 (15.9 → 16) - Small improvement

**Shows:** Players without focused training develop much slower, making training decisions important

---

## Sample Email Templates

### Monthly Training Report Email (Most Important!)
**Subject:** Monthly Training Report - [Month] [Year]  
**Category:** Squad  
**Priority:** Important  
**Content:**
```
From: Fitness Coach

Outstanding progress this month! Here's your complete development report:

🌟 STAR PERFORMERS:
━━━━━━━━━━━━━━━━━━━━
👤 Rodriguez (18, Pivot)
   Passing: 12 → 16 (+4) ⭐⭐⭐
   Vision: 10 → 12 (+2) ⭐⭐
   Comment: Exceptional growth! Rodriguez is becoming a key player.

👤 Silva (24, Winger)
   Dribbling: 14 → 16 (+2) ⭐⭐
   Pace: 15 → 16 (+1) ⭐
   Comment: Solid improvement in attacking attributes.

📈 OTHER IMPROVEMENTS:
━━━━━━━━━━━━━━━━━━━━
• Fernandez: Shooting 11 → 12 (+1)
• Costa: Stamina 13 → 14 (+1)
• Martinez: Passing 16 → 17 (+1)

📊 TEAM DEVELOPMENT:
━━━━━━━━━━━━━━━━━━━━
Total players improved: 7/15
Team chemistry: 78% (+5% this month)
Average squad rating: 13.8 → 14.2 (+0.4)

💪 NEXT MONTH RECOMMENDATIONS:
━━━━━━━━━━━━━━━━━━━━
• Continue high-intensity training for Rodriguez
• Focus on defensive work for back line
• Silva is approaching his potential in dribbling - consider new focus

[Button: Set Next Month's Training] [Button: View Squad] [Button: Player Details]
```

### Match Reminder Email
**Subject:** Upcoming Match: [Your Team] vs [Opponent]  
**Category:** Match Notifications  
**Priority:** Important  
**Content:**
```
Your next match is in 2 days:

Match: [Your Team] vs [Opponent]
Competition: [League/Cup Name]
Date: [Match Date]
Venue: [Home/Away]

Opposition Strength: 14 overall (Your team: 14 overall)
Key Player: [Opponent Star] - Rating 17

Current Form:
You: [W-D-L-W-D]
Opponent: [L-W-W-D-L]

Make sure to prepare your tactics and confirm your starting lineup.

[Button: Set Tactics] [Button: View Squad]
```

### Match Report Email
**Subject:** Match Report: [Your Team] [Score] [Opponent]  
**Category:** Match Notifications  
**Priority:** Normal  
**Content:**
```
From: Assistant Coach

Match Result: [Your Team] [Score] [Opponent]

Performance Summary:
[Brief 2-3 sentence analysis of the match]

Key Statistics:
- Possession: [X]%
- Shots: [X] ([X] on target)
- Pass Accuracy: [X]%

Top Performers:
1. [Player Name] - Rating: [X]/10
2. [Player Name] - Rating: [X]/10
3. [Player Name] - Rating: [X]/10

Match Experience Gained:
• Rodriguez earned valuable experience (+2 to monthly development)
• Silva's confidence boosted by his goal (+3 to monthly development)

[If there were injuries or cards]
Concerns:
- [Player] received yellow card (total: [X] this season)
- [Player] injured - out for [X] days

[Button: View Full Match Report] [Button: View Upcoming Fixtures]
```

### Transfer Offer Email
**Subject:** Transfer Offer Received for [Player Name]  
**Category:** Financial  
**Priority:** Important  
**Content:**
```
[Club Name] has submitted a transfer offer for [Player Name]:

Player Quality: 16 / 20 (Elite Level)
Age: [X] | Position: [Position]

Offer Details:
- Transfer Fee: $[Amount]
- Additional Bonuses: $[Amount]
- Player's Current Value: $[Amount]

Player Status:
- Contract Expires: [Date]
- Current Morale: [Happy/Content/Unhappy]
- Importance: [Key Player/Squad Player/Fringe]
- Development: [Improved +3 rating this season / Stagnating]

[Button: Accept Offer] [Button: Reject Offer] [Button: Make Counter Offer]
```

### Scout Report Email
**Subject:** Scout Report - Exciting Young Talent Identified  
**Category:** Squad  
**Priority:** Normal  
**Content:**
```
From: Chief Scout

I've identified a promising young player:

[Player Name] - Age [X] - [Position]
Club: [Current Club]
Current Ability: 11 / 20
Potential: ⭐⭐⭐⭐ (Elite Potential - could reach 17-18)

Key Attributes:
- Pace: 15
- Dribbling: 13
- Shooting: 10
- Passing: 12

Estimated Value: $[Amount]
Personality: [Determined/Professional/Casual]

Development Projection:
With focused training, could gain 2-3 rating points per season for next 3-4 years. 
Ideal project player for long-term development.

Recommendation: Strong prospect. Would benefit greatly from our training program.

[Button: View Full Profile] [Button: Make Offer] [Button: Add to Shortlist]
```

### Monthly Training Plan Reminder Email
**Subject:** Time to Set Next Month's Training Plan  
**Category:** Squad  
**Priority:** Important  
**Content:**
```
From: Fitness Coach

The new month is about to begin. It's time to review and set training plans.

Last Month's Results:
✅ 7 players improved
✅ Team chemistry increased to 78%

Recommendations for Next Month:
• Rodriguez - Continue passing focus (approaching elite level)
• Silva - Consider shifting from dribbling to shooting
• Fernandez - Needs defensive work
• Costa - Ready for high-intensity training

Players needing attention:
⚠️ Martinez - No improvement last month (consider new focus area)
⚠️ Lopez - Morale low (training intensity may be too high)

[Button: Set Training Plans] [Button: Review Last Month's Report] [Button: View Squad]
```

---

## Calendar & Time Progression

### Monthly Cycle Structure
**Week 1-4:** Regular matches and training
- User plays 4-6 competitive matches
- Training happens automatically in background (gains accumulate)
- Can adjust training plan mid-month if needed

**End of Month Processing:**
1. All training gains are calculated
2. Monthly training report is generated
3. User receives notification and email
4. Month advances to next month
5. User sets new monthly training plan

### Season Structure
- **10-12 months per season** (depends on league structure)
- **Summer break:** 1-2 months for transfers and pre-season training
- **Winter break:** Optional 2-week break (depending on league)
- **Monthly rhythm:** Play matches → Get monthly report → Plan next month → Repeat

---

## Final Notes
This game should be **fun, engaging, and rewarding** for players who enjoy sports management games. The **dual-scale attribute system (0-200 internal, 0-20 display as whole numbers)** combined with **monthly training reports** creates a perfect medium-term progression system that feels earned and satisfying.

**Key Benefits of Monthly Training System:**
- ✅ Players see meaningful improvements each month (1-3 rating points for focused training)
- ✅ Reduces notification spam compared to weekly or daily reports
- ✅ Creates anticipation - users look forward to end-of-month report
- ✅ Allows strategic planning (users choose monthly focus areas)
- ✅ Young prospects can realistically grow from 10 → 17 over 2-3 seasons
- ✅ Shows clear return on investment for training decisions
- ✅ Veteran decline feels natural over multiple months
- ✅ Makes training a strategic pillar of gameplay
- ✅ Whole number display (0-20) is clean and easy to understand

**Core Gameplay Loop:**
1. Set monthly training plan (strategic decision)
2. Play 4-6 matches throughout month (tactical gameplay)
3. Receive monthly report (reward and feedback)
4. Adjust training plan based on results (continuous improvement)
5. Repeat

Focus on making decisions meaningful - transfers, tactics, and **especially training** should clearly impact results. **The monthly training report should be one of the most exciting moments in the game** - users should eagerly await it to see how their players developed.

**The inbox should be the central hub for all game communications**, keeping players informed and immersed. **Player development should be the heart of the long-term engagement** - watching a 16-year-old prospect grow from 10 to 17 over 2-3 seasons should be incredibly satisfying and make users invested in their squad.

The UI should be intuitive with **all ratings displayed as whole numbers 0-20** - never show decimals to users. **Never expose the internal 0-200 scale to the user** - it should be completely hidden and only used in backend calculations.

Please build this game step-by-step, starting with the MVP features and ensuring each module works correctly before adding the next. **Test the monthly training system extensively** to ensure:
- Growth rates feel rewarding (young players: 2-4 points/month in focused stats)
- Strategic choices matter (focused training vs. balanced training)
- Monthly reports are exciting and motivating
- Whole number display works smoothly

Prioritize gameplay and functionality over visual polish initially, but maintain clean UI design throughout.