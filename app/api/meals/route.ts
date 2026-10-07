import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { searchMealImage, type MealImage } from "./unsplash";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const mealSchema = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },

          description: {
            type: "string",
          },

          whyItMatches: {
            type: "string",
          },

          cookingTime: {
            type: "string",
          },

          difficulty: {
            type: "string",
            enum: ["Easy", "Medium"],
          },

          pantryMatch: {
            type: "number",
          },

          imageSearchQuery: {
            type: "string",
          },

          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                },

                amount: {
                  type: "string",
                },
              },
              required: ["name", "amount"],
            },
          },

          missingIngredients: {
            type: "array",
            items: {
              type: "string",
            },
          },

          steps: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },

        required: [
          "name",
          "description",
          "whyItMatches",
          "cookingTime",
          "difficulty",
          "pantryMatch",
          "imageSearchQuery",
          "ingredients",
          "missingIngredients",
          "steps",
        ],
      },
    },
  },

  required: ["meals"],
};

type GeneratedMeal = {
  name: string;
  description: string;
  whyItMatches: string;
  cookingTime: string;
  difficulty: "Easy" | "Medium";
  pantryMatch: number;
  imageSearchQuery: string;

  ingredients: {
    name: string;
    amount: string;
  }[];

  missingIngredients: string[];
  steps: string[];
};

type MealWithImage = GeneratedMeal & {
  image: MealImage | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      appetite,
      hunger,
      effort,
      goal,
      ingredients,
    } = body;

    const prompt = `
You are the meal recommendation engine for
"What Are We Eating?"

Recommend exactly 4 practical, delicious whole-food meals.

Prioritize:

- Ingredients the user already has
- Their appetite
- Their hunger level
- Their desired cooking effort
- Their goal
- Simple, realistic cooking
- Meals that genuinely make sense together
- Meals that look appetizing and visually distinct

A meal does NOT need to use every ingredient available.

Common pantry basics such as:
- salt
- pepper
- cooking oil
- garlic
- onions
- basic herbs
- basic spices

can be assumed.

Do not provide calorie counts.

Do not shame or moralize about food.

Do not recommend restrictive eating.

Do not assume unusual ingredients.

For pantryMatch, estimate the percentage of the meal's
main ingredients that the user already has.

IMPORTANT:

For every meal, create an imageSearchQuery.

The imageSearchQuery will be sent to a food photography
search engine.

It should describe the ACTUAL FOOD in a simple,
visually searchable way.

Good examples:

"crispy potato hash fried egg"

"creamy garlic chicken skillet"

"chicken rice vegetable bowl"

"roasted potatoes yogurt herbs"

Bad examples:

"healthy dinner"

"high protein meal"

"easy meal"

"whole food recipe"

"meal for someone hungry"

The imageSearchQuery should generally contain 3-6
specific food words and should NOT contain words like
"healthy", "calories", "diet", "easy", "goal", or
"whole food".

Each meal must include:

- name
- description
- why it matches
- cooking time
- difficulty
- pantry match percentage
- imageSearchQuery
- ingredients with amounts
- missing ingredients
- step-by-step cooking instructions


USER:

Appetite:
${appetite || "Not specified"}

Hunger:
${hunger || "Not specified"}

Cooking effort:
${effort || "Not specified"}

Goal:
${goal || "Not specified"}


AVAILABLE INGREDIENTS:

${
  ingredients?.length
    ? ingredients.join(", ")
    : "No ingredients specified"
}
`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",

      input: prompt,

      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: mealSchema,
      },
    });

    const generatedData = JSON.parse(
      interaction.output_text ?? "",
    ) as {
      meals: GeneratedMeal[];
    };

    if (!generatedData.meals?.length) {
      return NextResponse.json(
        {
          error: "No meals were generated.",
        },
        { status: 500 },
      );
    }

    /*
     * Search Unsplash for each meal.
     *
     * We intentionally search using Gemini's
     * imageSearchQuery rather than the meal name.
     *
     * Example:
     *
     * "Golden Skillet Potato Hash with a Fried Egg"
     *
     * becomes:
     *
     * "crispy potato hash fried egg"
     *
     * which is much better for image search.
     */

    const mealsWithImages: MealWithImage[] =
      await Promise.all(
        generatedData.meals.map(
          async (meal): Promise<MealWithImage> => {
            try {
              const image = await searchMealImage(
                meal.imageSearchQuery,
              );

              return {
                ...meal,
                image,
              };
            } catch (error) {
              console.error(
                `Unsplash search failed for "${meal.name}":`,
                error,
              );

              /*
               * If Unsplash fails, we still return
               * the meal.
               *
               * This means one failed image request
               * will NEVER destroy the entire AI response.
               */

              return {
                ...meal,
                image: null,
              };
            }
          },
        ),
      );

    return NextResponse.json({
      meals: mealsWithImages,
    });
  } catch (error) {
    console.error(
      "Meal recommendation error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate meals right now.",
      },
      { status: 500 },
    );
  }
}