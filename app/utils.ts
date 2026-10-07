export const themeColors = [
  "#872100", 
  "#F4A261", 
  "#52796F", 
];

export const appetiteOptions = [
  "Light & fresh",
  "Comforting",
  "Something hearty ",
  "I don't know",
];

export const hungerOptions = [
  {
    title: "Just a little ",
    description: "A nimble snack or small fuel hit without sluggishness.",
    badge: "Bite 1 of 3",
    icon: "boxicons:bowl-bubbles",
  },
  {
    title: "I'm hungry",
    description: "Ready for a proper plate. Nourishing, substantial, satisfying.",
    badge: "Standard Anchor",
    icon: "fluent-emoji-flat:fork-and-knife",
  },
  {
    title: "I could eat everything",
    description: "Feed me right now or face the consequences.",
    badge: "High",
    icon: "emojione:fire",
  },
];

export const effortOptions = [
  {
    title: "Bare minimum",
    description: "Under 15 mins • 1 pan or zero-cook",
  },
  {
    title: "A little effort",
    description: "20–30 mins • Pleasant tunes & fresh chopping",
  },
  {
    title: "Let’s actually cook",
    description: "35+ mins • Mindful culinary therapy mode",
  },
];

export const goalOptions = [
  "High Protein",
  "Build muscle",
  "Lose body fat",
  "Just eat better",
  "🤷 Just feed me",
];

export  const initialIngredients = {
  Protein: [
    "Eggs",
    "Chicken",
    "Greek yogurt",
    "Cottage cheese",
    "Sardines",
    "Tuna",
    "Turkey",
    "Lean beef",
  ],
  Carbs: [
    "Potatoes",
    "Sweet potatoes",
    "Rice",
    "Oats",
    "Plantain",
    "Yam",
    "Whole wheat bread",
    "Quinoa",
  ],
  Produce: [
    "Tomatoes",
    "Spinach",
    "Carrots",
    "Cucumber",
    "Bell peppers",
    "Broccoli",
    "Avocado",
    "Apples",
    "Bananas",
    "Oranges",
    "Berries",
  ],
  Extras: [
    "Peanut butter",
    "Walnuts",
    "Chia seeds",
    "Almonds",
    "Olive oil",
    "Honey",
    "Cinnamon",
    "Sesame seeds",
  ],
};

export const categoryIcons = {
  Protein: "fluent-emoji-flat:chicken",
  Carbs: "fluent-emoji-flat:potato",
  Produce: "fluent-emoji-flat:leafy-green",
  Extras: "fluent-emoji-flat:peanuts",
};

 export type Meal = {
  name: string;
  description: string;
  whyItMatches: string;
  cookingTime: string;
  difficulty: "Easy" | "Medium";
  pantryMatch: number;

  imageSearchQuery: string;

  image: {
    url: string;
    alt: string;
    photographer: string;
    photographerUrl: string;
    unsplashUrl: string;
  } | null;

  ingredients: {
    name: string;
    amount: string;
  }[];

  missingIngredients: string[];
  steps: string[];
};