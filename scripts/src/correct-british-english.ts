import { db, articlesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * British → American spelling substitution map.
 * Each entry is [britishPattern, americanReplacement].
 * Patterns use word-boundary anchors (\b) to avoid partial-word matches.
 * Only genuine British/American variant pairs are listed here.
 */
const SUBSTITUTIONS: [RegExp, string][] = [
  // -our → -or
  [/\bcolour\b/g, "color"],
  [/\bColour\b/g, "Color"],
  [/\bCOLOUR\b/g, "COLOR"],
  [/\bcolours\b/g, "colors"],
  [/\bColours\b/g, "Colors"],
  [/\bcoloured\b/g, "colored"],
  [/\bColoured\b/g, "Colored"],
  [/\bcolouring\b/g, "coloring"],
  [/\bColourful\b/g, "Colorful"],
  [/\bcolourful\b/g, "colorful"],
  [/\bbehaviour\b/g, "behavior"],
  [/\bBehaviour\b/g, "Behavior"],
  [/\bbehaviours\b/g, "behaviors"],
  [/\bBehaviours\b/g, "Behaviors"],
  [/\bbehavioural\b/g, "behavioral"],
  [/\bBehavioural\b/g, "Behavioral"],
  [/\bfavour\b/g, "favor"],
  [/\bFavour\b/g, "Favor"],
  [/\bfavours\b/g, "favors"],
  [/\bfavoured\b/g, "favored"],
  [/\bfavourite\b/g, "favorite"],
  [/\bFavourite\b/g, "Favorite"],
  [/\bfavourites\b/g, "favorites"],
  [/\bharbour\b/g, "harbor"],
  [/\bHarbour\b/g, "Harbor"],
  [/\bharbours\b/g, "harbors"],
  [/\bhonour\b/g, "honor"],
  [/\bHonour\b/g, "Honor"],
  [/\bhonours\b/g, "honors"],
  [/\bhonoured\b/g, "honored"],
  [/\bhonouring\b/g, "honoring"],
  [/\bhonourable\b/g, "honorable"],
  [/\bHonourable\b/g, "Honorable"],
  [/\bhumour\b/g, "humor"],
  [/\bHumour\b/g, "Humor"],
  [/\bhumours\b/g, "humors"],
  [/\bhumoured\b/g, "humored"],
  [/\bhumourous\b/g, "humorous"],
  [/\blabour\b/g, "labor"],
  [/\bLabour\b/g, "Labor"],
  [/\blabours\b/g, "labors"],
  [/\blaboured\b/g, "labored"],
  [/\blabouring\b/g, "laboring"],
  [/\bneighbour\b/g, "neighbor"],
  [/\bNeighbour\b/g, "Neighbor"],
  [/\bneighbours\b/g, "neighbors"],
  [/\bneighbourhood\b/g, "neighborhood"],
  [/\bNeighbourhood\b/g, "Neighborhood"],
  [/\bodour\b/g, "odor"],
  [/\bOdour\b/g, "Odor"],
  [/\bodours\b/g, "odors"],
  [/\brumour\b/g, "rumor"],
  [/\bRumour\b/g, "Rumor"],
  [/\brumours\b/g, "rumors"],
  [/\brumoured\b/g, "rumored"],
  [/\btumour\b/g, "tumor"],
  [/\bTumour\b/g, "Tumor"],
  [/\btumours\b/g, "tumors"],
  [/\bvapour\b/g, "vapor"],
  [/\bVapour\b/g, "Vapor"],
  [/\bvapours\b/g, "vapors"],
  [/\bvigour\b/g, "vigor"],
  [/\bVigour\b/g, "Vigor"],
  [/\barmour\b/g, "armor"],
  [/\bArmour\b/g, "Armor"],
  [/\bglamour\b/g, "glamor"],
  [/\bGlamour\b/g, "Glamor"],
  [/\bclamour\b/g, "clamor"],
  [/\bClamour\b/g, "Clamor"],
  [/\bvalour\b/g, "valor"],
  [/\bValour\b/g, "Valor"],

  // -ise/-isation → -ize/-ization
  [/\borganise\b/g, "organize"],
  [/\bOrganise\b/g, "Organize"],
  [/\borganised\b/g, "organized"],
  [/\bOrganised\b/g, "Organized"],
  [/\borganising\b/g, "organizing"],
  [/\borganisation\b/g, "organization"],
  [/\bOrganisation\b/g, "Organization"],
  [/\borganisations\b/g, "organizations"],
  [/\bOrganisations\b/g, "Organizations"],
  [/\brealise\b/g, "realize"],
  [/\bRealise\b/g, "Realize"],
  [/\brealised\b/g, "realized"],
  [/\bRealised\b/g, "Realized"],
  [/\brealising\b/g, "realizing"],
  [/\brealisation\b/g, "realization"],
  [/\bRealisation\b/g, "Realization"],
  [/\brecognise\b/g, "recognize"],
  [/\bRecognise\b/g, "Recognize"],
  [/\brecognised\b/g, "recognized"],
  [/\bRecognised\b/g, "Recognized"],
  [/\brecognising\b/g, "recognizing"],
  [/\bspecialise\b/g, "specialize"],
  [/\bSpecialise\b/g, "Specialize"],
  [/\bspecialised\b/g, "specialized"],
  [/\bSpecialised\b/g, "Specialized"],
  [/\bspecialising\b/g, "specializing"],
  [/\bspecialisation\b/g, "specialization"],
  [/\bSpecialisation\b/g, "Specialization"],
  [/\banalyse\b/g, "analyze"],
  [/\bAnalyse\b/g, "Analyze"],
  [/\banalysed\b/g, "analyzed"],
  [/\banalysing\b/g, "analyzing"],
  [/\banalyser\b/g, "analyzer"],
  [/\bapologise\b/g, "apologize"],
  [/\bApologise\b/g, "Apologize"],
  [/\bapologised\b/g, "apologized"],
  [/\bapologising\b/g, "apologizing"],
  [/\bauthorise\b/g, "authorize"],
  [/\bAuthorise\b/g, "Authorize"],
  [/\bauthorised\b/g, "authorized"],
  [/\bauthorising\b/g, "authorizing"],
  [/\bauthorisation\b/g, "authorization"],
  [/\bAuthorisation\b/g, "Authorization"],
  [/\bcentralise\b/g, "centralize"],
  [/\bCentralise\b/g, "Centralize"],
  [/\bcentralised\b/g, "centralized"],
  [/\bcentralisation\b/g, "centralization"],
  [/\bcharacterise\b/g, "characterize"],
  [/\bCharacterise\b/g, "Characterize"],
  [/\bcharacterised\b/g, "characterized"],
  [/\bcivilise\b/g, "civilize"],
  [/\bcivilised\b/g, "civilized"],
  [/\bcivilisation\b/g, "civilization"],
  [/\bCivilisation\b/g, "Civilization"],
  [/\bcriticise\b/g, "criticize"],
  [/\bCriticise\b/g, "Criticize"],
  [/\bcriticised\b/g, "criticized"],
  [/\bcriticising\b/g, "criticizing"],
  [/\bdigitalise\b/g, "digitalize"],
  [/\bdigitalised\b/g, "digitalized"],
  [/\bdigitalisation\b/g, "digitalization"],
  [/\bDigitalisation\b/g, "Digitalization"],
  [/\benergise\b/g, "energize"],
  [/\bEnergise\b/g, "Energize"],
  [/\benergised\b/g, "energized"],
  [/\bfinalise\b/g, "finalize"],
  [/\bFinalise\b/g, "Finalize"],
  [/\bfinalised\b/g, "finalized"],
  [/\bfinalising\b/g, "finalizing"],
  [/\bgeneralise\b/g, "generalize"],
  [/\bGeneralise\b/g, "Generalize"],
  [/\bgeneralised\b/g, "generalized"],
  [/\bgeneralisation\b/g, "generalization"],
  [/\bhypnotise\b/g, "hypnotize"],
  [/\bimmobilise\b/g, "immobilize"],
  [/\bimmobilised\b/g, "immobilized"],
  [/\binitialise\b/g, "initialize"],
  [/\bInitialise\b/g, "Initialize"],
  [/\binitialised\b/g, "initialized"],
  [/\binitialising\b/g, "initializing"],
  [/\binitialisation\b/g, "initialization"],
  [/\binternalise\b/g, "internalize"],
  [/\bInternalise\b/g, "Internalize"],
  [/\binternalised\b/g, "internalized"],
  [/\blegalise\b/g, "legalize"],
  [/\blegalised\b/g, "legalized"],
  [/\blocalise\b/g, "localize"],
  [/\bLocalise\b/g, "Localize"],
  [/\blocalised\b/g, "localized"],
  [/\blocalisation\b/g, "localization"],
  [/\bLocalisation\b/g, "Localization"],
  [/\bmaximise\b/g, "maximize"],
  [/\bMaximise\b/g, "Maximize"],
  [/\bmaximised\b/g, "maximized"],
  [/\bmaximising\b/g, "maximizing"],
  [/\bminimise\b/g, "minimize"],
  [/\bMinimise\b/g, "Minimize"],
  [/\bminimised\b/g, "minimized"],
  [/\bminimising\b/g, "minimizing"],
  [/\bmobilise\b/g, "mobilize"],
  [/\bMobilise\b/g, "Mobilize"],
  [/\bmobilised\b/g, "mobilized"],
  [/\bmobilisation\b/g, "mobilization"],
  [/\bmonetise\b/g, "monetize"],
  [/\bMonetise\b/g, "Monetize"],
  [/\bmonetised\b/g, "monetized"],
  [/\bmonetising\b/g, "monetizing"],
  [/\bmonetisation\b/g, "monetization"],
  [/\bMonetisation\b/g, "Monetization"],
  [/\bnationalise\b/g, "nationalize"],
  [/\bnationalised\b/g, "nationalized"],
  [/\bnormalise\b/g, "normalize"],
  [/\bNormalise\b/g, "Normalize"],
  [/\bnormalised\b/g, "normalized"],
  [/\bnormalising\b/g, "normalizing"],
  [/\bnormalisation\b/g, "normalization"],
  [/\bNormalisation\b/g, "Normalization"],
  [/\boptimise\b/g, "optimize"],
  [/\bOptimise\b/g, "Optimize"],
  [/\boptimised\b/g, "optimized"],
  [/\bOptimised\b/g, "Optimized"],
  [/\boptimising\b/g, "optimizing"],
  [/\boptimisation\b/g, "optimization"],
  [/\bOptimisation\b/g, "Optimization"],
  [/\bparameterise\b/g, "parameterize"],
  [/\bparameterised\b/g, "parameterized"],
  [/\bprioritise\b/g, "prioritize"],
  [/\bPrioritise\b/g, "Prioritize"],
  [/\bprioritised\b/g, "prioritized"],
  [/\bprioritising\b/g, "prioritizing"],
  [/\bprioritisation\b/g, "prioritization"],
  [/\bPrioritisation\b/g, "Prioritization"],
  [/\bprivatise\b/g, "privatize"],
  [/\bprivatised\b/g, "privatized"],
  [/\bprivatisation\b/g, "privatization"],
  [/\brationalise\b/g, "rationalize"],
  [/\brationalised\b/g, "rationalized"],
  [/\brationalisation\b/g, "rationalization"],
  [/\bsocialise\b/g, "socialize"],
  [/\bSocialise\b/g, "Socialize"],
  [/\bsocialised\b/g, "socialized"],
  [/\bstandardise\b/g, "standardize"],
  [/\bStandardise\b/g, "Standardize"],
  [/\bstandardised\b/g, "standardized"],
  [/\bstandardisation\b/g, "standardization"],
  [/\bStandardisation\b/g, "Standardization"],
  [/\bsymbolise\b/g, "symbolize"],
  [/\bsymbolised\b/g, "symbolized"],
  [/\bsynchronise\b/g, "synchronize"],
  [/\bSynchronise\b/g, "Synchronize"],
  [/\bsynchronised\b/g, "synchronized"],
  [/\bsynchronising\b/g, "synchronizing"],
  [/\bsynchronisation\b/g, "synchronization"],
  [/\bSynchronisation\b/g, "Synchronization"],
  [/\butilise\b/g, "utilize"],
  [/\bUtilise\b/g, "Utilize"],
  [/\butilised\b/g, "utilized"],
  [/\bUtilised\b/g, "Utilized"],
  [/\butilising\b/g, "utilizing"],
  [/\butilisation\b/g, "utilization"],
  [/\bUtilisation\b/g, "Utilization"],
  [/\bvisualise\b/g, "visualize"],
  [/\bVisualise\b/g, "Visualize"],
  [/\bvisualised\b/g, "visualized"],
  [/\bvisualising\b/g, "visualizing"],
  [/\bvisualisation\b/g, "visualization"],
  [/\bVisualisation\b/g, "Visualization"],
  [/\bwesternise\b/g, "westernize"],
  [/\bwesternised\b/g, "westernized"],
  [/\bcolonise\b/g, "colonize"],
  [/\bcolonised\b/g, "colonized"],
  [/\bsystemise\b/g, "systemize"],

  // -re → -er
  [/\bcentre\b/g, "center"],
  [/\bCentre\b/g, "Center"],
  [/\bcentres\b/g, "centers"],
  [/\bCentres\b/g, "Centers"],
  [/\bfibre\b/g, "fiber"],
  [/\bFibre\b/g, "Fiber"],
  [/\bfibres\b/g, "fibers"],
  [/\blitre\b/g, "liter"],
  [/\bLitre\b/g, "Liter"],
  [/\blitres\b/g, "liters"],
  [/\bmetre\b/g, "meter"],
  [/\bMetre\b/g, "Meter"],
  [/\bmetres\b/g, "meters"],
  [/\bmitre\b/g, "miter"],
  [/\bMitre\b/g, "Miter"],
  [/\bsceptre\b/g, "scepter"],
  [/\bspectre\b/g, "specter"],
  [/\bSpectre\b/g, "Specter"],
  [/\btheatre\b/g, "theater"],
  [/\bTheatre\b/g, "Theater"],
  [/\btheatres\b/g, "theaters"],

  // -ence → -ense
  [/\bdefence\b/g, "defense"],
  [/\bDefence\b/g, "Defense"],
  [/\bdefences\b/g, "defenses"],
  [/\boffence\b/g, "offense"],
  [/\bOffence\b/g, "Offense"],
  [/\boffences\b/g, "offenses"],
  [/\bpretence\b/g, "pretense"],
  [/\bPretence\b/g, "Pretense"],
  [/\blicence\b/g, "license"],
  [/\bLicence\b/g, "License"],
  [/\blicences\b/g, "licenses"],

  // double-consonant before suffix
  [/\btravelling\b/g, "traveling"],
  [/\bTravelling\b/g, "Traveling"],
  [/\btravelled\b/g, "traveled"],
  [/\bTravelled\b/g, "Traveled"],
  [/\btraveller\b/g, "traveler"],
  [/\bTraveller\b/g, "Traveler"],
  [/\btravellers\b/g, "travelers"],
  [/\bcancelled\b/g, "canceled"],
  [/\bCancelled\b/g, "Canceled"],
  [/\bcancelling\b/g, "canceling"],
  [/\bcounselling\b/g, "counseling"],
  [/\bCounselling\b/g, "Counseling"],
  [/\bcounsellor\b/g, "counselor"],
  [/\bCounsellor\b/g, "Counselor"],
  [/\bmodelling\b/g, "modeling"],
  [/\bModelling\b/g, "Modeling"],
  [/\bmodelled\b/g, "modeled"],
  [/\bModelled\b/g, "Modeled"],
  [/\bsignalling\b/g, "signaling"],
  [/\bSignalling\b/g, "Signaling"],
  [/\bsignalled\b/g, "signaled"],
  [/\bfuelling\b/g, "fueling"],
  [/\bfuelled\b/g, "fueled"],
  [/\blabelled\b/g, "labeled"],
  [/\bLabelled\b/g, "Labeled"],
  [/\blabelling\b/g, "labeling"],
  [/\bLabelling\b/g, "Labeling"],
  [/\bprogramme\b/g, "program"],
  [/\bProgramme\b/g, "Program"],
  [/\bprogrammes\b/g, "programs"],
  [/\bProgrammes\b/g, "Programs"],

  // Common standalone word differences
  [/\bwhilst\b/g, "while"],
  [/\bWhilst\b/g, "While"],
  [/\bamongst\b/g, "among"],
  [/\bAmongst\b/g, "Among"],
  [/\btowards\b/g, "toward"],
  [/\bTowards\b/g, "Toward"],
  [/\bafterwards\b/g, "afterward"],
  [/\bAfterwards\b/g, "Afterward"],
  [/\bbackwards\b/g, "backward"],
  [/\bBackwards\b/g, "Backward"],
  [/\bper cent\b/g, "percent"],
  [/\bPer cent\b/g, "Percent"],
  [/\bper-cent\b/g, "percent"],
  [/\bcosy\b/g, "cozy"],
  [/\bCOSY\b/g, "COZY"],
  [/\bcheque\b/g, "check"],
  [/\bCheque\b/g, "Check"],
  [/\bcheques\b/g, "checks"],
  [/\banaesthetic\b/g, "anesthetic"],
  [/\bAnaesthetic\b/g, "Anesthetic"],
  [/\baeroplane\b/g, "airplane"],
  [/\bAeroplane\b/g, "Airplane"],
  [/\baeroplanes\b/g, "airplanes"],
  [/\banaemia\b/g, "anemia"],
  [/\bAnaemia\b/g, "Anemia"],
  [/\bskilful\b/g, "skillful"],
  [/\bSkilful\b/g, "Skillful"],
  [/\bskilfully\b/g, "skillfully"],
  [/\bwilful\b/g, "willful"],
  [/\bWilful\b/g, "Willful"],
  [/\bfulfil\b/g, "fulfill"],
  [/\bFulfil\b/g, "Fulfill"],
  [/\bfulfils\b/g, "fulfills"],
  [/\binstalment\b/g, "installment"],
  [/\bInstalments\b/g, "Installments"],
  [/\benrolment\b/g, "enrollment"],
  [/\bEnrolment\b/g, "Enrollment"],
  [/\bfulfilment\b/g, "fulfillment"],
  [/\bFulfilment\b/g, "Fulfillment"],
  [/\btyre\b/g, "tire"],
  [/\bTyre\b/g, "Tire"],
  [/\btyres\b/g, "tires"],
  [/\bplough\b/g, "plow"],
  [/\bPlough\b/g, "Plow"],
  [/\bmaths\b/g, "math"],
  [/\bMaths\b/g, "Math"],
  [/\bcatalogue\b/g, "catalog"],
  [/\bCatalogue\b/g, "Catalog"],
  [/\bcatalogues\b/g, "catalogs"],
  [/\bdialogue\b/g, "dialog"],
  [/\bDialogue\b/g, "Dialog"],
  [/\bdialogues\b/g, "dialogs"],
  [/\bmonologue\b/g, "monolog"],
  [/\banalogue\b/g, "analog"],
  [/\bAnalogue\b/g, "Analog"],
  [/\banalogues\b/g, "analogs"],
  [/\bsceptic\b/g, "skeptic"],
  [/\bSceptic\b/g, "Skeptic"],
  [/\bsceptics\b/g, "skeptics"],
  [/\bsceptical\b/g, "skeptical"],
  [/\bSceptical\b/g, "Skeptical"],
  [/\bscepticism\b/g, "skepticism"],
  [/\bScepticism\b/g, "Skepticism"],
];

type ArticleRow = {
  id: number;
  slug: string;
  title: string;
  dek: string;
  excerpt: string | null;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

function applySubstitutions(text: string): string {
  let result = text;
  for (const [pattern, replacement] of SUBSTITUTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function correctArticle(article: ArticleRow): Partial<ArticleRow> | null {
  const fields = [
    "title",
    "dek",
    "excerpt",
    "body",
    "seoTitle",
    "seoDescription",
  ] as const;

  const updates: Partial<ArticleRow> = {};
  let changed = false;

  for (const field of fields) {
    const original = article[field];
    if (original == null) continue;
    const corrected = applySubstitutions(original);
    if (corrected !== original) {
      (updates as Record<string, string>)[field] = corrected;
      changed = true;
    }
  }

  return changed ? updates : null;
}

async function main(): Promise<void> {
  console.log("Scanning all articles for British English spellings...\n");

  const articles = await db
    .select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      dek: articlesTable.dek,
      excerpt: articlesTable.excerpt,
      body: articlesTable.body,
      seoTitle: articlesTable.seoTitle,
      seoDescription: articlesTable.seoDescription,
    })
    .from(articlesTable);

  console.log(`Total articles scanned: ${articles.length}`);

  let updatedCount = 0;

  for (const article of articles) {
    const updates = correctArticle(article);
    if (updates === null) continue;

    await db
      .update(articlesTable)
      .set(updates)
      .where(eq(articlesTable.id, article.id));

    const changedFields = Object.keys(updates).join(", ");
    console.log(`  Updated article ${article.id} (${article.slug}): [${changedFields}]`);
    updatedCount += 1;
  }

  console.log(`\nSummary: ${updatedCount} of ${articles.length} articles updated.`);
  if (updatedCount === 0) {
    console.log("No British spellings found — content is already consistent.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
