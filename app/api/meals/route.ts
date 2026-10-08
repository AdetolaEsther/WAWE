import { type } from "arktype";
import { NextResponse } from "next/server";
import {
  AnthropicModel,
  CloudflareImageGenerator,
  type ImageGenerator,
  type MealModel,
  MealRequest,
  type MealWithImages,
} from "@/app/lib/meals";

const IMAGE_VARIATIONS = 1;
const IMAGES_ENABLED = true;

export async function POST(request: Request) {
  try {
    const parsed = MealRequest(await request.json());
    if (parsed instanceof type.errors) {
      return NextResponse.json({ error: parsed.summary }, { status: 400 });
    }

    const textModel: MealModel = new AnthropicModel("claude-sonnet-4-5");
    const imageModel: ImageGenerator = new CloudflareImageGenerator();

    const meals = await textModel.createMeals(parsed);

    const mealsWithImages: MealWithImages[] = IMAGES_ENABLED
      ? await Promise.all(
          meals.map(async (meal) => ({
            ...meal,
            images: await imageModel.generateImages(meal, IMAGE_VARIATIONS),
          })),
        )
      : meals.map((meal) => ({ ...meal, images: [] }));

    return NextResponse.json({ meals: mealsWithImages });
  } catch (error) {
    console.error("Meal recommendation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate meals right now." },
      { status: 500 },
    );
  }
}
