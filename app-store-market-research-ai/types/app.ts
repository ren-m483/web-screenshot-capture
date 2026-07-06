export interface NormalizedApp {
  appId: string;
  bundleId: string | null;
  name: string;
  developerName: string | null;
  sellerName: string | null;
  primaryGenreId: string | null;
  primaryGenreName: string | null;
  genreIds: string[];
  genres: string[];
  price: number | null;
  formattedPrice: string | null;
  currency: string | null;
  averageUserRating: number | null;
  userRatingCount: number | null;
  version: string | null;
  releaseDate: string | null;
  currentVersionReleaseDate: string | null;
  description: string | null;
  screenshotUrls: string[];
  ipadScreenshotUrls: string[];
  artworkUrl100: string | null;
  trackViewUrl: string | null;
  contentAdvisoryRating: string | null;
  supportedDevices: string[];
  raw: unknown;
}
