import TurndownService from "turndown";

export const turndownService = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
turndownService.keep(["table", "thead", "tbody", "tr", "th", "td", "video"]);
