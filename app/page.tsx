"use client";
import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";
import type { MealImage, MealWithImages } from "./lib/meals";
import {
  appetiteOptions,
  categoryIcons,
  effortOptions,
  goalOptions,
  hungerOptions,
  initialIngredients,
  themeColors,
} from "./utils";

type Category = keyof typeof initialIngredients;
type PantryItem = { name: string; category: Category };

// Times arrive in seconds
const formatMinutes = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

const loadingMessages = [
  "Checking your kitchen...",
  "Matching your cravings...",
  "Putting your ingredients to work...",
  "Building your plate...",
  "Finding something delicious...",
  "Almost there...",
];

function LoadingMessage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % loadingMessages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return <>{loadingMessages[index]}</>;
}

const imageSrc = (image: MealImage) => `data:${image.mimeType};base64,${image.data}`;

const pantryCoverage = (meal: MealWithImages) =>
  meal.ingredients.length
    ? Math.round(
        (meal.ingredients.filter((i) => i.inPantry).length / meal.ingredients.length) * 100,
      )
    : 0;

export default function Home() {
  const [activeNav, setActiveNav] = useState("discover");
  const [activeStep, setActiveStep] = useState(1);
  const [appetite, setAppetite] = useState("");
  const [hunger, setHunger] = useState("");
  const [effort, setEffort] = useState("");
  const [goal, setGoal] = useState("");

  const [ingredients, setIngredients] = useState(initialIngredients);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [newIngredientCategory, setNewIngredientCategory] =
    useState<keyof typeof ingredients>("Protein");

  const [searchValues, setSearchValues] = useState({
    Protein: "",
    Carbs: "",
    Produce: "",
    Extras: "",
  });

  const handleIngredientToggle = (ingredient: string) => {
    setSelectedIngredients((current) =>
      current.includes(ingredient)
        ? current.filter((item) => item !== ingredient)
        : [...current, ingredient],
    );
  };

  const handleSearchChange = (category: keyof typeof ingredients, value: string) => {
    setSearchValues((current) => ({
      ...current,
      [category]: value,
    }));
  };

  const handleAddIngredient = (category: keyof typeof ingredients) => {
    const value = searchValues[category].trim();

    if (!value) return;

    setIngredients((current) => ({
      ...current,
      [category]: current[category].includes(value)
        ? current[category]
        : [...current[category], value],
    }));

    setSearchValues((current) => ({
      ...current,
      [category]: "",
    }));
  };

  const [meals, setMeals] = useState<MealWithImages[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadyToGenerate = appetite && hunger && effort && goal && selectedIngredients.length > 0;

  const handleGenerateMeals = async () => {
    if (!isReadyToGenerate || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appetite,
          hunger,
          effort,
          goal,
          ingredients: selectedIngredients,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to generate meals");
      }
      if (!Array.isArray(data?.meals)) {
        throw new Error("Unexpected response from the server.");
      }

      setMeals(data.meals as MealWithImages[]);

      // Reveal the results section
      setShowResults(true);

      setTimeout(() => {
        document.getElementById("curated-results")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      console.error("Meal generation failed:", err);
      setError(err instanceof Error ? err.message : "Unable to generate meals right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const [isPantryOpen, setIsPantryOpen] = useState(false);
  const [pantrySearch, setPantrySearch] = useState("");
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([
    { name: "Chicken breast", category: "Protein" },
    { name: "Eggs", category: "Protein" },
    { name: "Greek yogurt", category: "Protein" },
    { name: "Potatoes", category: "Carbs" },
  ]);

  const findInCatalog = (name: string) => {
    for (const category of Object.keys(ingredients) as Category[]) {
      const match = ingredients[category].find((i) => i.toLowerCase() === name.toLowerCase());
      if (match) return { name: match, category };
    }
    return undefined;
  };

  const matchedCatalogItem = findInCatalog(pantrySearch.trim());
  const [pantryTab, setPantryTab] = useState<Category | "All">("All");

  const addPantryItem = (item: PantryItem) =>
    setPantryItems((current) =>
      current.some((i) => i.name.toLowerCase() === item.name.toLowerCase())
        ? current
        : [...current, item],
    );

  const handleAddToPantry = () => {
    const value = pantrySearch.trim();
    if (!value) return;

    addPantryItem(
      findInCatalog(value) ?? {
        name: value,
        category: pantryTab === "All" ? "Extras" : pantryTab,
      },
    );
    setPantrySearch("");
  };

  const loadFromPantry = () => {
    // 1. Make sure every pantry item exists under its category
    setIngredients((current) => {
      const next = { ...current };
      pantryItems.forEach(({ name, category }) => {
        if (!next[category].some((i) => i.toLowerCase() === name.toLowerCase())) {
          next[category] = [...next[category], name];
        }
      });
      return next;
    });

    // 2. Select them, keeping anything already selected
    setSelectedIngredients((current) =>
      Array.from(new Set([...current, ...pantryItems.map((i) => i.name)])),
    );

    setActiveStep(5);
  };
  const accentColor = themeColors[(activeStep - 1) % themeColors.length];
  const pantryCategories = Object.keys(ingredients) as Category[];

  const categoryEmoji: Record<string, string> = {
    Protein: "🥩",
    Carbs: "🥔",
    Produce: "🥦",
    Extras: "🍯",
  };
  const emojiFor = (category: string) => categoryEmoji[category] ?? "🍽️";
  const pantryQuery = pantrySearch.trim().toLowerCase();
  const stockedNames = new Set(pantryItems.map((i) => i.name.toLowerCase()));

  const suggestions = (pantryTab === "All" ? pantryCategories : [pantryTab])
    .flatMap((category) =>
      ingredients[category]
        .filter(
          (name) =>
            !stockedNames.has(name.toLowerCase()) && name.toLowerCase().includes(pantryQuery),
        )
        .slice(0, pantryTab === "All" && !pantryQuery ? 3 : 9)
        .map((name) => ({ name, category })),
    )
    .slice(0, 12);

  const [_selectedMeal, setSelectedMeal] = useState<MealWithImages | null>(null);

  const pantryDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = pantryDialogRef.current;
    if (!dialog) return;
    if (isPantryOpen && !dialog.open) dialog.showModal();
    if (!isPantryOpen && dialog.open) dialog.close();
  }, [isPantryOpen]);

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 w-full shadow-xs bg-white/35 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full items-center justify-between px-6 lg:px-8">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3"
            aria-label="Back to top"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CE4C27]">
              <Icon icon="fa7-solid:cutlery" className="text-xl text-white" />
            </div>

            <span className="text-xl font-bold tracking-tight text-[#872100]">
              What Are We Eating?
            </span>
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-1 rounded-full bg-gray-100 p-1 lg:flex">
              <button
                type="button"
                onClick={() => {
                  setActiveNav("discover");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeNav === "discover"
                    ? "bg-gray-200 text-[#2F1400]"
                    : "text-[#2F1400] hover:bg-gray-200"
                }`}
              >
                Discover
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveNav("pantry");
                  setIsPantryOpen(true);
                }}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeNav === "pantry"
                    ? "bg-gray-200 text-[#2F1400]"
                    : "text-[#2F1400] hover:bg-gray-200"
                }`}
              >
                My Pantry
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF8B6A] px-1.5 text-xs font-bold text-[#2F1400]">
                  {pantryItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav("saved")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeNav === "saved"
                    ? "bg-gray-200 text-[#2F1400]"
                    : "text-[#2F1400] hover:bg-gray-200"
                }`}
              >
                Saved Meals
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C1EBDF] px-1.5 text-xs font-bold text-[#2F1400]">
                  3
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav("preferences")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeNav === "preferences"
                    ? "bg-gray-200 text-[#2F1400]"
                    : "text-[#2F1400] hover:bg-gray-200"
                }`}
              >
                Preferences
              </button>
            </div>

            {/* Avatar */}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E25B34] transition hover:bg-[#C94D2B]"
              aria-label="Open profile"
            >
              <Icon icon="clarity:avatar-line" className="text-xl text-white" />
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <section className="mx-auto mb-20 w-full max-w-7xl px-6">
          <div className="grid items-center gap-12 py-16 lg:grid-cols-[1fr_0.8fr] lg:py-20">
            <div className="flex flex-col items-start">
              <div className="mb-6 flex items-center gap-3 rounded-full bg-[#FFDCC4] px-5 py-2">
                <Icon icon="arcticons:questionnaire-star" className="text-2xl" />

                <p className="text-sm font-medium text-[#2F1400]">
                  The anti-calorie-counter meal finder
                </p>
              </div>

              <h1 className="max-w-xl text-6xl font-bold leading-[1.05] tracking-tight text-[#2F1400] lg:text-7xl">
                What are we <span className="text-[#601400]">eating?</span>
              </h1>

              <p className="mt-8 max-w-xl text-xl leading-relaxed text-[#CA7F41]">
                Tell me what you’re craving, what you have, and how much effort you’re willing to
                put in. I’ll figure out the rest.
              </p>

              <div className="mt-5 w-fit rounded-lg bg-gray-100 px-4 py-2">
                <p className="text-sm leading-relaxed text-gray-600">
                  No calorie counting. No guilt. Just real, delicious food that makes you feel
                  amazing.
                </p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="-rotate-3 bg-white p-4 pb-16 shadow-xl">
                <img
                  src="/fresh-whole-foods.jpg"
                  alt="whole-food"
                  className="h-120 w-112.5 object-cover"
                />
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto mb-20 w-full max-w-7xl overflow-hidden rounded-lg bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: accentColor }}
              >
                <Icon icon="famicons:flash" className="text-sm" />
              </div>

              <p className="text-xl font-bold text-[#2F1400]">Curate Your Plate</p>
            </div>

            <div className="hidden items-center gap-3 text-xs text-[#2F1400] sm:flex">
              <span className="font-semibold">5-STEP ADAPTIVE DISCOVERY</span>

              <span className="text-[#601400]">•</span>

              <span className="text-[#601400]">READY TO SPIN</span>
            </div>
          </div>

          <div className="border-b border-gray-100 px-6 py-8">
            <StepHeading
              step="01"
              label="Appetite Direction"
              title="What are you in the mood for?"
              description="Pick the energy of your plate today."
              color={themeColors[0]}
            />

            <div className="mt-6 flex flex-wrap gap-3">
              {appetiteOptions.map((option) => {
                const selected = appetite === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setAppetite(option);
                      setActiveStep(1);
                    }}
                    className="rounded-full border px-5 py-3 text-sm font-semibold transition-all"
                    style={{
                      borderColor: selected ? themeColors[0] : "#872100",
                      backgroundColor: selected ? themeColors[0] : "white",
                      color: selected ? "white" : "#2F1400",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-gray-100 px-6 py-8">
            <StepHeading
              step="02"
              label="Fuel Calibration"
              title="How hungry are you?"
              description="Honest appetites only."
              color={themeColors[1]}
            />

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {hungerOptions.map((option) => {
                const selected = hunger === option.title;

                return (
                  <button
                    key={option.title}
                    type="button"
                    onClick={() => {
                      setHunger(option.title);
                      setActiveStep(2);
                    }}
                    className="rounded-2xl border-2 p-5 text-left transition-all hover:-translate-y-1 hover:shadow-md"
                    style={{
                      borderColor: selected ? themeColors[1] : "transparent",
                      backgroundColor: selected ? "#FFF3E8" : "#F9F9F9",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                        <Icon icon={option.icon} className="text-2xl" />
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#601400]">
                        {option.badge}
                      </span>
                    </div>

                    <h3 className="mt-8 text-lg font-bold text-[#2F1400]">{option.title}</h3>

                    <p className="mt-2 text-sm leading-relaxed text-[#6F5143]">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-gray-100 px-6 py-8">
            <StepHeading
              step="03"
              label="Kitchen Energy"
              title="How much effort are we putting in?"
              description="Energy levels vary. We honour that."
              color={themeColors[2]}
            />

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {effortOptions.map((option) => {
                const selected = effort === option.title;

                return (
                  <button
                    key={option.title}
                    type="button"
                    onClick={() => {
                      setEffort(option.title);
                      setActiveStep(3);
                    }}
                    className="rounded-2xl border-2 p-5 text-left transition-all hover:-translate-y-1 hover:shadow-md"
                    style={{
                      borderColor: selected ? themeColors[0] : "transparent",
                      backgroundColor: selected ? "#F8EEE9" : "#F9F9F9",
                    }}
                  >
                    <h3 className="text-lg font-bold text-[#2F1400]">{option.title}</h3>

                    <p className="mt-2 text-sm leading-relaxed text-[#6F5143]">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-gray-100 px-6 py-8">
            <StepHeading
              step="04"
              label="Synergy"
              title="What are we working toward?"
              description="No restrictive nonsense here. Just pure whole-food synergy."
              color={themeColors[0]}
            />

            <div className="mt-6 flex flex-wrap gap-3">
              {goalOptions.map((option) => {
                const selected = goal === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setGoal(option);
                      setActiveStep(4);
                    }}
                    className="rounded-full border px-5 py-3 text-sm font-semibold transition-all"
                    style={{
                      borderColor: selected ? themeColors[2] : "#E8D8CF",
                      backgroundColor: selected ? themeColors[2] : "white",
                      color: selected ? "white" : "#2F1400",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-gray-100 px-6 py-8">
            <div className="flex flex-col gap-6">
              <StepHeading
                step="05"
                label="Fridge & Pantry Check"
                title="What's in your kitchen?"
                description="Select anything you have right now. Don't worry about quantities."
                color={themeColors[1]}
              />

              <button
                type="button"
                onClick={loadFromPantry}
                className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-[#BFE5D7] bg-[#F0FBF7] p-5 text-left transition-all hover:border-[#8ACDB8] hover:bg-[#E8F8F2]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#CFFAED] text-[#52796F]">
                    <Icon icon="solar:archive-up-linear" className="text-xl" />
                  </div>

                  <div>
                    <p className="font-bold text-[#2F1400]">Already have a pantry?</p>

                    <p className="mt-0.5 text-sm text-[#52796F]">
                      Use your saved ingredients and skip the tapping.
                    </p>
                  </div>
                </div>

                <Icon
                  icon="material-symbols:arrow-forward"
                  className="shrink-0 text-xl text-[#52796F] transition-transform group-hover:translate-x-1"
                />
              </button>

              {selectedIngredients.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6F6660]">
                      Selected
                    </p>

                    <span className="text-xs text-gray-400">
                      {selectedIngredients.length} selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedIngredients.map((ingredient) => (
                      <button
                        key={ingredient}
                        type="button"
                        onClick={() => handleIngredientToggle(ingredient)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#872100] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#C94E2D]"
                      >
                        {ingredient}

                        <Icon icon="material-symbols:close" className="text-sm" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-7">
                {(Object.keys(ingredients) as Array<keyof typeof ingredients>).map((category) => {
                  const searchValue = searchValues[category];

                  const filteredIngredients = ingredients[category].filter((ingredient) =>
                    ingredient.toLowerCase().includes(searchValue.toLowerCase()),
                  );

                  return (
                    <div key={category}>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF3EC]">
                          <Icon icon={categoryIcons[category]} className="text-sm text-[#872100]" />
                        </div>

                        <span className="text-xs font-bold uppercase tracking-wider text-[#6F6660]">
                          {category}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {filteredIngredients.map((ingredient) => {
                          const selected = selectedIngredients.includes(ingredient);

                          return (
                            <button
                              key={ingredient}
                              type="button"
                              onClick={() => {
                                handleIngredientToggle(ingredient);
                                setActiveStep(5);
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                                selected
                                  ? "border-[#E25B34] bg-[#872100] text-white shadow-sm"
                                  : "border-[#E8E2DD] bg-white text-[#3F3833] hover:border-[#E25B34] hover:bg-[#FFF8F3]"
                              }`}
                            >
                              {selected && (
                                <Icon icon="material-symbols:check" className="text-sm" />
                              )}

                              {ingredient}
                            </button>
                          );
                        })}
                      </div>

                      {searchValue && (
                        <div className="mt-3 flex max-w-md items-center gap-2">
                          <div className="flex flex-1 items-center rounded-xl border border-[#E8E2DD] bg-white px-3 focus-within:border-[#E25B34] focus-within:ring-2 focus-within:ring-[#E25B34]/10">
                            <Icon
                              icon="material-symbols:search"
                              className="shrink-0 text-gray-400"
                            />

                            <input
                              type="text"
                              value={searchValue}
                              onChange={(event) => handleSearchChange(category, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  handleAddIngredient(category);
                                }
                              }}
                              placeholder={`Add ${category.toLowerCase()}...`}
                              className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => handleAddIngredient(category)}
                              className="text-[#E25B34] hover:text-[#601400]"
                            >
                              <Icon icon="material-symbols:add" className="text-xl" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!addingIngredient ? (
                <button
                  type="button"
                  onClick={() => setAddingIngredient(true)}
                  className="flex w-fit items-center gap-2 text-sm font-semibold text-[#E25B34] transition hover:text-[#601400]"
                >
                  <Icon icon="material-symbols:add" className="text-lg" />
                  Add another ingredient
                </button>
              ) : (
                <div className="flex flex-col gap-3 rounded-2xl border border-[#E8E2DD] bg-[#FFFBF8] p-4 sm:flex-row sm:items-end">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="ingredient-category"
                      className="text-xs font-bold uppercase tracking-wider text-[#6F6660]"
                    >
                      Category
                    </label>

                    <select
                      id="ingredient-category"
                      value={newIngredientCategory}
                      onChange={(event) =>
                        setNewIngredientCategory(event.target.value as keyof typeof ingredients)
                      }
                      className="h-10 rounded-lg border border-[#E8E2DD] bg-white px-3 text-sm text-[#2F1400] outline-none focus:border-[#E25B34]"
                    >
                      {(Object.keys(ingredients) as Array<keyof typeof ingredients>).map(
                        (category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="flex flex-1 flex-col gap-1.5">
                    <label
                      htmlFor="new-ingredient"
                      className="text-xs font-bold uppercase tracking-wider text-[#6F6660]"
                    >
                      Ingredient
                    </label>

                    <div className="flex items-center rounded-lg border border-[#E8E2DD] bg-white px-3 transition focus-within:border-[#E25B34] focus-within:ring-2 focus-within:ring-[#E25B34]/10">
                      <Icon icon="material-symbols:search" className="shrink-0 text-gray-400" />

                      <input
                        id="new-ingredient"
                        type="text"
                        value={searchValues[newIngredientCategory]}
                        onChange={(event) =>
                          handleSearchChange(newIngredientCategory, event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            handleAddIngredient(newIngredientCategory);
                          }

                          if (event.key === "Escape") {
                            setAddingIngredient(false);
                          }
                        }}
                        placeholder={`Add ${newIngredientCategory.toLowerCase()}...`}
                        className="w-full bg-transparent px-2 py-2.5 text-sm text-[#2F1400] outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddIngredient(newIngredientCategory)}
                    disabled={!searchValues[newIngredientCategory].trim()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#872100] px-4 text-sm font-semibold text-white transition hover:bg-[#C94E2D] disabled:cursor-not-allowed disabled:bg-[#E8E2DD] disabled:text-[#A39A94]"
                  >
                    <Icon icon="material-symbols:add" className="text-lg" />
                    Add
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddingIngredient(false)}
                    className="h-10 px-2 text-sm font-medium text-gray-500 transition hover:text-[#2F1400]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 border-t border-gray-200 px-6 py-10">
            <div className="rounded-2xl bg-[#FFF3EC] p-8 text-center">
              <div className="mx-auto max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#E25B34]">
                  {isReadyToGenerate ? "Your plate is ready to be found" : "Almost there"}
                </p>

                <h2 className="mt-3 text-3xl font-bold text-[#2F1400]">Show me what I can eat</h2>

                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-gray-600">
                  I’ll match your mood, hunger, effort level, goal, and what you already have in the
                  kitchen.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {appetite && (
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-medium text-[#2F1400] shadow-sm">
                      {appetite}
                    </span>
                  )}

                  {hunger && (
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-medium text-[#2F1400] shadow-sm">
                      {hunger}
                    </span>
                  )}

                  {effort && (
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-medium text-[#2F1400] shadow-sm">
                      {effort}
                    </span>
                  )}

                  {goal && (
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-medium text-[#2F1400] shadow-sm">
                      {goal}
                    </span>
                  )}

                  {selectedIngredients.length > 0 && (
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-medium text-[#2F1400] shadow-sm">
                      {selectedIngredients.length} ingredients
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!isReadyToGenerate || isLoading}
                  onClick={handleGenerateMeals}
                  className={`mt-8 inline-flex min-w-60 items-center justify-center gap-3 rounded-full px-8 py-4 text-base font-bold transition-all ${
                    isReadyToGenerate && !isLoading
                      ? "bg-[#872100] text-white shadow-md hover:bg-[#601400] hover:shadow-lg active:scale-[0.98]"
                      : "cursor-not-allowed bg-[#E8E2DD] text-[#A39A94]"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Icon icon="solar:refresh-linear" className="animate-spin text-xl" />
                      <LoadingMessage />
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:magic-stick-3-linear" className="text-xl" />
                      Show me what I can eat
                    </>
                  )}
                </button>

                {!isReadyToGenerate && (
                  <p className="mt-4 text-xs text-gray-400">
                    Choose your mood, hunger, effort, goal, and at least one ingredient.
                  </p>
                )}

                {error && (
                  <p role="alert" className="mt-4 text-sm text-red-600">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {showResults && (
          <>
            <section id="curated-results" className="flex flex-col gap-8 px-6 pb-20 pt-12">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[#E25B34]">
                  Your kitchen, your options
                </p>

                <h2 className="mt-2 text-3xl font-bold text-[#2F1400]">Here’s what you can eat.</h2>

                <p className="mt-2 text-sm text-gray-500">
                  Four ideas based on what you’re craving and what you already have.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {meals.map((meal) => (
                  <article
                    key={`${meal.name}`}
                    className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                  >
                    {/* Meal Image (placeholder when generation failed or returned nothing) */}
                    {meal.images.length > 0 ? (
                      <div className="h-64 overflow-hidden">
                        <img
                          src={imageSrc(meal.images[0])}
                          alt={meal.images[0].alt ?? meal.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-64 items-center justify-center bg-[#FFF3EC] text-5xl">
                        🍽️
                      </div>
                    )}

                    {/* Meal Content */}
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-[#FFF3EC] px-3 py-1 text-xs font-semibold text-[#E25B34]">
                          {pantryCoverage(meal)}% pantry match
                        </span>

                        <span className="text-sm text-gray-400">
                          {formatMinutes(meal.prepTime + meal.cookingTime)}
                        </span>
                      </div>

                      <h3 className="mt-5 text-xl font-bold text-[#2F1400]">{meal.name}</h3>

                      <p className="mt-2 text-sm leading-6 text-gray-500">{meal.description}</p>

                      <p className="mt-3 text-sm italic leading-6 text-[#6F5143]">
                        {meal.whyItMatches}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium">
                          {meal.difficulty}
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium">
                          Prep {formatMinutes(meal.prepTime)}
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium">
                          Cook {formatMinutes(meal.cookingTime)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedMeal(meal)}
                        className="mt-6 w-full rounded-full bg-[#872100] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#601400]"
                      >
                        Make this
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="mt-2 flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#FFF3EC] p-6 shadow-sm md:flex-row md:items-center md:p-8">
              <div className="flex max-w-2xl flex-col gap-2">
                <div className="flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#2F1400]">
                  <span>🎲</span>
                  <span>Decision fatigue breaker</span>
                </div>

                <h3 className="text-2xl font-bold text-[#2F1400]">Not feeling these?</h3>

                <p className="text-sm leading-relaxed text-gray-600">
                  Mood shifted? Let the culinary roulette wheel decide. I’ll combine a few things
                  from your kitchen into a delicious whole-food experiment.
                </p>
              </div>

              <button
                type="button"
                className="flex shrink-0 items-center gap-2 rounded-full bg-[#2F1400] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#601400] hover:shadow-md active:scale-95"
              >
                <span className="text-lg">🎲</span>

                <span>Surprise me</span>

                <Icon icon="material-symbols:arrow-forward" className="text-lg" />
              </button>
            </div>
          </>
        )}

        {isPantryOpen && (
          <dialog
            ref={pantryDialogRef}
            onClose={() => setIsPantryOpen(false)} // fires on Escape, too
            onClick={(event) => {
              if (event.target === event.currentTarget) setIsPantryOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsPantryOpen(false);
            }}
            className="m-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-[#EBDCD0] bg-white p-0 shadow-[0_20px_50px_rgba(74,66,61,0.22)] backdrop:bg-[#1C1C19]/55 backdrop:backdrop-blur-[6px]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EBE8E3] bg-gradient-to-b from-[#F6F3EE]/60 to-transparent p-6 pb-4 sm:p-8 sm:pb-5">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFDCC4] text-2xl text-[#8E4E14] shadow-sm">
                  🥫
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight text-[#1C1C19]">
                      Stock Your Pantry
                    </h3>
                    <span className="rounded-full bg-[#FFDCC4] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#6F3800]">
                      Kitchen Hub
                    </span>
                  </div>

                  <p className="mt-1 text-[13px] leading-5 text-[#59413B]">
                    Keep track of whole food staples, produce, and fridge favorites so you never
                    wonder what to cook.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPantryOpen(false)}
                aria-label="Close pantry"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0EDE9] text-[#59413B] transition-colors hover:bg-[#EBE8E3] hover:text-[#1C1C19]"
              >
                <Icon icon="material-symbols:close" className="text-xl" />
              </button>
            </div>

            <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto p-6 sm:p-8">
              <div>
                <div className="flex items-center gap-2 rounded-full border border-[#EBE8E3] bg-[#F6F3EE] p-1.5 pl-4 shadow-inner transition-all focus-within:border-[#A8320D]">
                  <Icon icon="material-symbols:search" className="text-[22px] text-[#59413B]" />

                  <input
                    value={pantrySearch}
                    onChange={(event) => setPantrySearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleAddToPantry();
                    }}
                    placeholder="Search ingredients or type your own (e.g., tahini, bell pepper)..."
                    className="w-full bg-transparent text-[15px] text-[#1C1C19] outline-none placeholder:text-[#59413B]/70"
                  />

                  <button
                    type="button"
                    onClick={handleAddToPantry}
                    disabled={!pantrySearch.trim()}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#A8320D] px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#CA4A24] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon icon="material-symbols:add" className="text-lg" />
                    Add
                  </button>
                </div>

                {pantrySearch.trim() && (
                  <p className="mt-2 pl-4 text-xs text-[#59413B]">
                    {matchedCatalogItem ? (
                      <>
                        Will be added under{" "}
                        <span className="font-semibold text-[#A8320D]">
                          {matchedCatalogItem.category}
                        </span>
                      </>
                    ) : pantryTab === "All" ? (
                      <>
                        Custom item, goes under{" "}
                        <span className="font-semibold text-[#A8320D]">Extras</span>. Pick a
                        category below to change it.
                      </>
                    ) : (
                      <>
                        Will be added under{" "}
                        <span className="font-semibold text-[#A8320D]">{pantryTab}</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E4E14]">
                  Browse by Category
                </span>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(["All", ...pantryCategories] as Array<Category | "All">).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPantryTab(tab)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                        pantryTab === tab
                          ? "bg-[#A8320D] text-white shadow-sm"
                          : "bg-[#F6F3EE] text-[#59413B] hover:bg-[#F0EDE9]"
                      }`}
                    >
                      {tab === "All" ? "All" : `${emojiFor(tab)} ${tab}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#59413B]">
                    {pantryQuery ? "Matches" : "Popular Whole-Food Staples"}
                  </span>
                  <span className="text-xs text-[#59413B]">Tap to add quickly</span>
                </div>

                {suggestions.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {suggestions.map((item) => (
                      <button
                        key={`${item.category}-${item.name}`}
                        type="button"
                        onClick={() => addPantryItem(item)}
                        className="group flex items-center justify-between rounded-xl border border-transparent bg-[#F6F3EE] p-2.5 text-left transition-all hover:border-[#FFDCC4] hover:bg-[#FFDCC4]/30"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#1C1C19] group-hover:text-[#8E4E14]">
                          <span>{emojiFor(item.category)}</span>
                          {item.name}
                        </span>
                        <Icon
                          icon="material-symbols:add"
                          className="text-lg text-[#59413B] group-hover:text-[#8E4E14]"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-[#F6F3EE] px-4 py-3 text-xs text-[#59413B]">
                    {pantryQuery
                      ? "Nothing in the catalog matches. Press Add to stock it as your own item."
                      : "Everything in this category is already in your pantry."}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-[#F0EDE9] bg-[#F6F3EE]/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:shelves" className="text-xl text-[#A8320D]" />
                    <span className="text-[13px] font-semibold text-[#1C1C19]">
                      Items Currently Stocked
                    </span>
                    <span className="rounded-full bg-[#FFDBD1] px-2 py-0.5 text-[11px] font-bold text-[#872100]">
                      {pantryItems.length} {pantryItems.length === 1 ? "item" : "items"} in pantry
                    </span>
                  </div>

                  {pantryItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPantryItems([])}
                      className="text-[11px] text-[#59413B] underline transition-colors hover:text-[#BA1A1A]"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {pantryItems.length > 0 ? (
                  <div className="flex flex-col gap-4 pt-1">
                    {pantryCategories.map((category) => {
                      const items = pantryItems.filter((item) => item.category === category);
                      if (items.length === 0) return null;

                      return (
                        <div key={category}>
                          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#59413B]">
                            <span>{emojiFor(category)}</span>
                            {category}
                            <span className="font-normal normal-case text-[#59413B]/60">
                              ({items.length})
                            </span>
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {items.map((item) => (
                              <span
                                key={item.name}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#EBE8E3] bg-white px-3 py-1 text-[11px] font-bold text-[#1C1C19] shadow-sm"
                              >
                                {item.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPantryItems((current) =>
                                      current.filter((p) => p.name !== item.name),
                                    )
                                  }
                                  aria-label={`Remove ${item.name}`}
                                  className="ml-0.5 flex items-center text-[#59413B] transition-colors hover:text-[#BA1A1A]"
                                >
                                  <Icon icon="material-symbols:close" className="text-sm" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E0BFB7] bg-white/60 px-6 py-8 text-center">
                    <p className="font-semibold text-[#1C1C19]">Your pantry is empty</p>
                    <p className="mt-1 text-sm text-[#59413B]">
                      Tap a staple above or type your own to get started.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-[#F0EDE9] bg-white p-5 sm:flex-row sm:px-8">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#59413B]">
                <Icon
                  icon="material-symbols:sync-saved-locally-outline"
                  className="text-base text-[#3D635A]"
                />
                Changes apply as you add them
              </div>

              <button
                type="button"
                onClick={() => setIsPantryOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#A8320D] px-6 py-2.5 text-base font-bold text-white shadow-[0_4px_16px_rgba(168,50,13,0.3)] transition-all hover:scale-105 hover:bg-[#CA4A24] active:scale-95 sm:w-auto"
              >
                Done ({pantryItems.length} {pantryItems.length === 1 ? "item" : "items"})
                <Icon icon="material-symbols:check" className="text-lg" />
              </button>
            </div>
          </dialog>
        )}
      </main>
    </div>
  );
}

const StepHeading = ({
  step,
  label,
  title,
  description,
  color,
}: {
  step: string;
  label: string;
  title: string;
  description: string;
  color: string;
}) => {
  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-widest" style={{ color }}>
        Step {step} / {label}
      </p>

      <h2 className="mt-2 text-2xl font-bold text-[#2F1400]">{title}</h2>

      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
};
