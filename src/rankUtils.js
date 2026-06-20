// src/rankUtils.js

const RANKS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Conqueror"];
const XP_PER_LEVEL = 1500;

export const getRankDetails = (totalXP) => {
  // Level 0 to 14 (Total 15 levels)
  const currentLevel = Math.min(Math.floor(totalXP / XP_PER_LEVEL), 14);
  const rankIndex = Math.floor(currentLevel / 3);
  const subRank = 3 - (currentLevel % 3);
  
  const rankName = RANKS[rankIndex] || "Conqueror";
  return {
    rankName,
    subRank: rankName === "Conqueror" ? "" : subRank,
    fullRank: rankName === "Conqueror" ? "Conqueror" : `${rankName} ${["", "III", "II", "I"][subRank]}`,
    level: currentLevel,
    nextLevelXP: (currentLevel + 1) * XP_PER_LEVEL,
    progressPercent: rankName === "Conqueror" ? 100 : ((totalXP % XP_PER_LEVEL) / XP_PER_LEVEL) * 100
  };
};

// Generate 150 fake competitors (Global Leaderboard)
export const generateCompetitors = () => {
  const names = ["Aryan", "Rahul", "Priya", "Vikram", "Sneha", "Karan", "Anjali", "Rohan", "Dev", "Ishaan", "Aditya", "Neha", "Rishabh", "Tanvi", "Kabir"];
  const surnames = ["_IITB", "_JEE2027", "_Coder", "_Ranker", "_Grind", "_Beast", "_MnC", "_KGP", "_HFT", "_Quant"];
  
  return Array.from({ length: 150 }, (_, i) => ({
    id: i,
    name: `${names[i % 15]}${surnames[i % 10]}${Math.floor(Math.random() * 99)}`,
    xp: Math.floor(Math.random() * 18000), // Base random XP for everyone
  })).sort((a, b) => b.xp - a.xp);
};

// Update competitors XP daily (Daily grind simulation)
export const updateCompetitorsGrowth = (competitors) => {
  return competitors.map(c => ({
    ...c,
    xp: c.xp + Math.floor(Math.random() * (1000 - 300) + 300) // Daily 300-1000 XP badhega unka
  })).sort((a, b) => b.xp - a.xp); // Rank sort based on XP
};
