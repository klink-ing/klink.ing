import * as fs from "node:fs";
import * as path from "node:path";
import Markdoc, { type Config, type Node } from "@markdoc/markdoc";
import yaml from "js-yaml";

export interface Frontmatter {
	name: string;
	github: string;
	email: string;
}

export function getResumeContent(): string {
	const filePath = path.join(process.cwd(), "resume.markdoc.md");
	return fs.readFileSync(filePath, "utf-8");
}

export function parseResumeFrontmatter(ast: Node): Frontmatter | null {
	if (!ast.attributes.frontmatter) {
		return null;
	}
	return yaml.load(ast.attributes.frontmatter) as Frontmatter;
}

export function validateFrontmatter(
	frontmatter: Frontmatter | null,
	requireAllFields = true,
): asserts frontmatter is Frontmatter {
	if (!frontmatter) {
		throw new Error("Frontmatter not found in markdoc file");
	}
	if (
		requireAllFields &&
		(!frontmatter.name || !frontmatter.github || !frontmatter.email)
	) {
		throw new Error("Missing required frontmatter fields: name, github, email");
	}
}

export function extractGithubUsername(githubUrl: string): string {
	return githubUrl
		.replace(/^https?:\/\/(www\.)?github\.com\//, "")
		.replace(/\/$/, "");
}

export function getResumeAstAndFrontmatter(requireAllFields = true): {
	ast: Node;
	frontmatter: Frontmatter;
} {
	const fileContent = getResumeContent();
	const ast = Markdoc.parse(fileContent);
	const frontmatter = parseResumeFrontmatter(ast);
	validateFrontmatter(frontmatter, requireAllFields);
	return { ast, frontmatter: frontmatter as Frontmatter };
}

export function createConfigWithFrontmatter(
	config: Config,
	frontmatter: Frontmatter,
): Config {
	return {
		...config,
		variables: {
			frontmatter,
		},
	};
}
