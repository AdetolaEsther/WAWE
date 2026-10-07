import { GoogleModel, MealRequest, supportsImages, type MealModel } from "@/app/lib/meals";
import { NextResponse } from "next/server";
import { type } from "arktype";

const IMAGE_VARIATIONS = 1;

export async function POST(request: Request) {
  try {
    const parsed = MealRequest(await request.json());
    if (parsed instanceof type.errors) {
      return NextResponse.json({ error: parsed.summary }, { status: 400 });
    }

    const model: MealModel = new GoogleModel("gemini-2.5-flash");
    // const model: MealModel = new AnthropicModel("claude-sonnet-4-5");

    const meals = supportsImages(model)
      ? await model.createMealsWithImages(parsed, IMAGE_VARIATIONS)
      : await model.createMeals(parsed);

    return NextResponse.json({ meals });
  } catch (error) {
    console.error("Meal recommendation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate meals right now." },
      { status: 500 },
    );
  }
}
