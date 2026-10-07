type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  description: string | null;

  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };

  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };

  links: {
    html: string;
    download_location: string;
  };
};

type UnsplashSearchResponse = {
  results: UnsplashPhoto[];
};

export type MealImage = {
  url: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
};

export async function searchMealImage(
  query: string,
): Promise<MealImage | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    throw new Error("UNSPLASH_ACCESS_KEY is not configured.");
  }

  const params = new URLSearchParams({
    query,
    per_page: "5",
    orientation: "landscape",
    content_filter: "high",
  });

  const response = await fetch(
    `https://api.unsplash.com/search/photos?${params.toString()}`,
    {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Unsplash image search failed (${response.status}): ${errorText}`,
    );
  }

  const data: UnsplashSearchResponse = await response.json();

  const photo = data.results?.[0];

  if (!photo) {
    return null;
  }

  const photographerUrl = new URL(photo.user.links.html);

  photographerUrl.searchParams.set(
    "utm_source",
    "what_are_we_eating",
  );

  photographerUrl.searchParams.set(
    "utm_medium",
    "referral",
  );

  const unsplashUrl = new URL("https://unsplash.com/");

  unsplashUrl.searchParams.set(
    "utm_source",
    "what_are_we_eating",
  );

  unsplashUrl.searchParams.set(
    "utm_medium",
    "referral",
  );

  return {
    // IMPORTANT:
    // Unsplash requires API users to hotlink the URL returned
    // by the API rather than downloading/hosting the image.
    url: photo.urls.regular,

    alt:
      photo.alt_description ??
      photo.description ??
      query,

    photographer: photo.user.name,

    photographerUrl: photographerUrl.toString(),

    unsplashUrl: unsplashUrl.toString(),
  };
}