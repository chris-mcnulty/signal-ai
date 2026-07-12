import { describe, it, expect } from "vitest";
import { applySubstitutions } from "./correct-british-english.lib.js";

describe("applySubstitutions", () => {
  describe("no-op on already-American text", () => {
    it("leaves plain American text untouched", () => {
      const text = "The color of the building was analyzed by the organization.";
      expect(applySubstitutions(text)).toBe(text);
    });

    it("leaves an empty string untouched", () => {
      expect(applySubstitutions("")).toBe("");
    });

    it("leaves text with no British spellings untouched", () => {
      const text = "The quick brown fox jumps over the lazy dog.";
      expect(applySubstitutions(text)).toBe(text);
    });

    it("is idempotent: applying twice gives the same result as once", () => {
      const text = "The colour of the theatre was analysed whilst travelling.";
      const once = applySubstitutions(text);
      const twice = applySubstitutions(once);
      expect(twice).toBe(once);
    });
  });

  describe("-our → -or substitutions", () => {
    it("converts colour → color", () => {
      expect(applySubstitutions("The colour is bright.")).toBe("The color is bright.");
    });

    it("converts Colour → Color (capitalised)", () => {
      expect(applySubstitutions("Colour matters.")).toBe("Color matters.");
    });

    it("converts COLOUR → COLOR (all-caps)", () => {
      expect(applySubstitutions("COLOUR SCHEME")).toBe("COLOR SCHEME");
    });

    it("converts colourful → colorful", () => {
      expect(applySubstitutions("A colourful display.")).toBe("A colorful display.");
    });

    it("converts behaviour → behavior", () => {
      expect(applySubstitutions("Strange behaviour.")).toBe("Strange behavior.");
    });

    it("converts behavioural → behavioral", () => {
      expect(applySubstitutions("behavioural science")).toBe("behavioral science");
    });

    it("converts favour → favor", () => {
      expect(applySubstitutions("Do me a favour.")).toBe("Do me a favor.");
    });

    it("converts favourite → favorite", () => {
      expect(applySubstitutions("my favourite song")).toBe("my favorite song");
    });

    it("converts honour → honor", () => {
      expect(applySubstitutions("It is an honour.")).toBe("It is an honor.");
    });

    it("converts honourable → honorable", () => {
      expect(applySubstitutions("the honourable member")).toBe("the honorable member");
    });

    it("converts humour → humor", () => {
      expect(applySubstitutions("a sense of humour")).toBe("a sense of humor");
    });

    it("converts labour → labor", () => {
      expect(applySubstitutions("labour market reforms")).toBe("labor market reforms");
    });

    it("converts neighbour → neighbor", () => {
      expect(applySubstitutions("my neighbour's garden")).toBe("my neighbor's garden");
    });

    it("converts neighbourhood → neighborhood", () => {
      expect(applySubstitutions("the neighbourhood watch")).toBe("the neighborhood watch");
    });

    it("converts rumour → rumor", () => {
      expect(applySubstitutions("just a rumour")).toBe("just a rumor");
    });

    it("converts tumour → tumor", () => {
      expect(applySubstitutions("a benign tumour")).toBe("a benign tumor");
    });

    it("converts vapour → vapor", () => {
      expect(applySubstitutions("water vapour")).toBe("water vapor");
    });

    it("converts vigour → vigor", () => {
      expect(applySubstitutions("full of vigour")).toBe("full of vigor");
    });

    it("converts armour → armor", () => {
      expect(applySubstitutions("knights in armour")).toBe("knights in armor");
    });

    it("converts glamour → glamor", () => {
      expect(applySubstitutions("old Hollywood glamour")).toBe("old Hollywood glamor");
    });
  });

  describe("-ise/-isation → -ize/-ization substitutions", () => {
    it("converts organise → organize", () => {
      expect(applySubstitutions("We need to organise the event.")).toBe(
        "We need to organize the event."
      );
    });

    it("converts organisation → organization", () => {
      expect(applySubstitutions("a non-profit organisation")).toBe(
        "a non-profit organization"
      );
    });

    it("converts realise → realize", () => {
      expect(applySubstitutions("I didn't realise that.")).toBe("I didn't realize that.");
    });

    it("converts realisation → realization", () => {
      expect(applySubstitutions("a sudden realisation")).toBe("a sudden realization");
    });

    it("converts recognise → recognize", () => {
      expect(applySubstitutions("I recognise your face.")).toBe("I recognize your face.");
    });

    it("converts specialise → specialize", () => {
      expect(applySubstitutions("doctors who specialise in oncology")).toBe(
        "doctors who specialize in oncology"
      );
    });

    it("converts analyse → analyze", () => {
      expect(applySubstitutions("We will analyse the data.")).toBe(
        "We will analyze the data."
      );
    });

    it("converts optimise → optimize", () => {
      expect(applySubstitutions("optimise performance")).toBe("optimize performance");
    });

    it("converts optimisation → optimization", () => {
      expect(applySubstitutions("query optimisation")).toBe("query optimization");
    });

    it("converts prioritise → prioritize", () => {
      expect(applySubstitutions("prioritise tasks")).toBe("prioritize tasks");
    });

    it("converts monetise → monetize", () => {
      expect(applySubstitutions("how to monetise content")).toBe(
        "how to monetize content"
      );
    });

    it("converts initialise → initialize", () => {
      expect(applySubstitutions("initialise the system")).toBe("initialize the system");
    });

    it("converts synchronise → synchronize", () => {
      expect(applySubstitutions("synchronise your devices")).toBe(
        "synchronize your devices"
      );
    });

    it("converts utilise → utilize", () => {
      expect(applySubstitutions("utilise all resources")).toBe("utilize all resources");
    });

    it("converts visualise → visualize", () => {
      expect(applySubstitutions("visualise the data")).toBe("visualize the data");
    });
  });

  describe("-re → -er substitutions", () => {
    it("converts centre → center", () => {
      expect(applySubstitutions("the city centre")).toBe("the city center");
    });

    it("converts Centre → Center (capitalised)", () => {
      expect(applySubstitutions("The Kennedy Centre")).toBe("The Kennedy Center");
    });

    it("converts fibre → fiber", () => {
      expect(applySubstitutions("fibre optic cables")).toBe("fiber optic cables");
    });

    it("converts litre → liter", () => {
      expect(applySubstitutions("two litres of water")).toBe("two liters of water");
    });

    it("converts metre → meter", () => {
      expect(applySubstitutions("100 metres sprint")).toBe("100 meters sprint");
    });

    it("converts theatre → theater", () => {
      expect(applySubstitutions("the local theatre")).toBe("the local theater");
    });

    it("converts spectre → specter", () => {
      expect(applySubstitutions("the spectre of inflation")).toBe(
        "the specter of inflation"
      );
    });
  });

  describe("-ence → -ense substitutions", () => {
    it("converts defence → defense", () => {
      expect(applySubstitutions("national defence budget")).toBe(
        "national defense budget"
      );
    });

    it("converts offence → offense", () => {
      expect(applySubstitutions("a criminal offence")).toBe("a criminal offense");
    });

    it("converts pretence → pretense", () => {
      expect(applySubstitutions("under false pretence")).toBe("under false pretense");
    });

    it("converts licence → license", () => {
      expect(applySubstitutions("a driving licence")).toBe("a driving license");
    });
  });

  describe("double-consonant before suffix", () => {
    it("converts travelling → traveling", () => {
      expect(applySubstitutions("travelling abroad")).toBe("traveling abroad");
    });

    it("converts traveller → traveler", () => {
      expect(applySubstitutions("a seasoned traveller")).toBe("a seasoned traveler");
    });

    it("converts cancelled → canceled", () => {
      expect(applySubstitutions("the flight was cancelled")).toBe(
        "the flight was canceled"
      );
    });

    it("converts counselling → counseling", () => {
      expect(applySubstitutions("grief counselling services")).toBe(
        "grief counseling services"
      );
    });

    it("converts modelling → modeling", () => {
      expect(applySubstitutions("financial modelling")).toBe("financial modeling");
    });

    it("converts signalling → signaling", () => {
      expect(applySubstitutions("cell signalling pathways")).toBe(
        "cell signaling pathways"
      );
    });

    it("converts labelled → labeled", () => {
      expect(applySubstitutions("clearly labelled containers")).toBe(
        "clearly labeled containers"
      );
    });

    it("converts programme → program", () => {
      expect(applySubstitutions("a television programme")).toBe(
        "a television program"
      );
    });

    it("converts programmes → programs", () => {
      expect(applySubstitutions("government programmes")).toBe("government programs");
    });
  });

  describe("standalone word differences", () => {
    it("converts whilst → while", () => {
      expect(applySubstitutions("whilst working")).toBe("while working");
    });

    it("converts amongst → among", () => {
      expect(applySubstitutions("amongst friends")).toBe("among friends");
    });

    it("converts towards → toward", () => {
      expect(applySubstitutions("moving towards the goal")).toBe(
        "moving toward the goal"
      );
    });

    it("converts afterwards → afterward", () => {
      expect(applySubstitutions("She left afterwards.")).toBe("She left afterward.");
    });

    it("converts backwards → backward", () => {
      expect(applySubstitutions("a step backwards")).toBe("a step backward");
    });

    it("converts per cent → percent", () => {
      expect(applySubstitutions("a 5 per cent rise")).toBe("a 5 percent rise");
    });

    it("converts per-cent → percent", () => {
      expect(applySubstitutions("a 5 per-cent rise")).toBe("a 5 percent rise");
    });

    it("converts cheque → check", () => {
      expect(applySubstitutions("write a cheque")).toBe("write a check");
    });

    it("converts maths → math", () => {
      expect(applySubstitutions("maths class")).toBe("math class");
    });

    it("converts catalogue → catalog", () => {
      expect(applySubstitutions("product catalogue")).toBe("product catalog");
    });

    it("converts dialogue → dialog", () => {
      expect(applySubstitutions("the dialogue was tense")).toBe(
        "the dialog was tense"
      );
    });

    it("converts analogue → analog", () => {
      expect(applySubstitutions("analogue signal")).toBe("analog signal");
    });

    it("converts sceptic → skeptic", () => {
      expect(applySubstitutions("a sceptic would disagree")).toBe(
        "a skeptic would disagree"
      );
    });

    it("converts sceptical → skeptical", () => {
      expect(applySubstitutions("I am sceptical")).toBe("I am skeptical");
    });

    it("converts scepticism → skepticism", () => {
      expect(applySubstitutions("healthy scepticism")).toBe("healthy skepticism");
    });

    it("converts aeroplane → airplane", () => {
      expect(applySubstitutions("board the aeroplane")).toBe("board the airplane");
    });

    it("converts fulfil → fulfill", () => {
      expect(applySubstitutions("fulfil a promise")).toBe("fulfill a promise");
    });

    it("converts fulfilment → fulfillment", () => {
      expect(applySubstitutions("a sense of fulfilment")).toBe(
        "a sense of fulfillment"
      );
    });

    it("converts skilful → skillful", () => {
      expect(applySubstitutions("a skilful negotiator")).toBe("a skillful negotiator");
    });
  });

  describe("word-boundary safety", () => {
    it("does not mangle 'forward' via the 'forwards' rule", () => {
      expect(applySubstitutions("moving forward")).toBe("moving forward");
    });

    it("does not mangle 'backward' via the 'backwards' rule", () => {
      expect(applySubstitutions("a backward glance")).toBe("a backward glance");
    });

    it("does not mangle 'afterward' via the 'afterwards' rule", () => {
      expect(applySubstitutions("the day afterward")).toBe("the day afterward");
    });

    it("does not mangle 'toward' via the 'towards' rule", () => {
      expect(applySubstitutions("a step toward peace")).toBe("a step toward peace");
    });

    it("does not touch 'forecast' (contains no matching pattern)", () => {
      expect(applySubstitutions("the weather forecast")).toBe("the weather forecast");
    });

    it("does not mangle 'coloring' (already American) via the colour rules", () => {
      expect(applySubstitutions("coloring book")).toBe("coloring book");
    });

    it("does not mangle 'centering' via any centre rule", () => {
      expect(applySubstitutions("centering the layout")).toBe("centering the layout");
    });

    it("does not touch 'beforehand' (no 'before' rule)", () => {
      expect(applySubstitutions("plan beforehand")).toBe("plan beforehand");
    });

    it("does not mangle words that merely contain a British substring mid-word", () => {
      expect(applySubstitutions("indefensible")).toBe("indefensible");
    });

    it("does not mangle 'program' via the programme rule", () => {
      expect(applySubstitutions("run the program")).toBe("run the program");
    });

    it("does not mangle 'traveled' (already American) via travelling rules", () => {
      expect(applySubstitutions("she traveled abroad")).toBe("she traveled abroad");
    });

    it("does not mangle 'analog' (already American) via analogue rule", () => {
      expect(applySubstitutions("analog circuit")).toBe("analog circuit");
    });

    it("does not mangle 'while' (already American) via whilst rule", () => {
      expect(applySubstitutions("wait a while")).toBe("wait a while");
    });

    it("does not mangle 'among' (already American) via amongst rule", () => {
      expect(applySubstitutions("among us")).toBe("among us");
    });
  });

  describe("multiple substitutions in one string", () => {
    it("corrects several British spellings in the same sentence", () => {
      const input =
        "Whilst travelling, she realised the colour of the theatre was quite unusual.";
      const expected =
        "While traveling, she realized the color of the theater was quite unusual.";
      expect(applySubstitutions(input)).toBe(expected);
    });

    it("handles a mixed article with British and American spellings", () => {
      const input =
        "The organisation optimised its defence strategy, while keeping costs under control.";
      const expected =
        "The organization optimized its defense strategy, while keeping costs under control.";
      expect(applySubstitutions(input)).toBe(expected);
    });
  });
});
