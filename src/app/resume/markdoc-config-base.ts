import Markdoc, { type Config, type Node } from "@markdoc/markdoc";

const addListAttributes = (
	node: Node,
	attrs: Record<string, unknown>,
): void => {
	if (!node.children.length) return;
	node.children.forEach((child) => {
		if (child.type === "list") {
			child.attributes = {
				...child.attributes,
				...attrs,
			};
			return;
		}
		addListAttributes(child, attrs);
	});
};

// Base Markdoc configuration shared between resume and resume-txt
// This contains the common tags and nodes
export const baseConfig: Config = {
	tags: {
		stint: {
			render: "Stint",
			attributes: {
				title: { type: String, required: true },
				start: { type: String },
				end: { type: String },
				location: { type: String, required: true },
				organization: { type: String, required: true },
				url: { type: String },
				pageBreak: { type: Boolean },
			},
		},
		skillsSection: {
			render: "SkillsSection",
			attributes: {},
			transform(node, config) {
				addListAttributes(node, { listType: "compact" });
				return new Markdoc.Tag(
					"SkillsSection",
					node.attributes,
					node.transformChildren(config),
				);
			},
		},
	},
	nodes: {
		list: {
			attributes: {
				ordered: { type: Boolean },
				marker: { type: String },
				listType: { type: String },
			},
			transform(node, config) {
				addListAttributes(node, { listType: "compact" });
				return new Markdoc.Tag(
					"List",
					node.attributes,
					node.transformChildren(config),
				);
			},
		},
	},
};
