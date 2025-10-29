
import { Outline, MainIdea, SubIdea, NestedSubIdea } from '../types';

interface ParsedNode {
    level: number;
    title: string;
    content: string;
    children: ParsedNode[];
}

const parseMarkdownToTree = (markdown: string): ParsedNode[] => {
    const lines = markdown.split('\n');
    const root: ParsedNode = { level: 0, title: 'root', content: '', children: [] };
    const path: ParsedNode[] = [root];

    for (const line of lines) {
        const match = line.match(/^(#{1,3})\s(.+)/);
        if (match) {
            const level = match[1].length;
            const title = match[2].trim();
            const newNode: ParsedNode = { level, title, content: '', children: [] };

            while (path.length > 1 && path[path.length - 1].level >= level) {
                path.pop();
            }
            path[path.length - 1].children.push(newNode);
            path.push(newNode);
        } else {
            if (path.length > 1) {
                const currentNode = path[path.length - 1];
                currentNode.content += (currentNode.content ? '\n' : '') + line;
            }
        }
    }
    return root.children;
};


const mapTreeToOutline = (tree: ParsedNode[], originalIdeas: MainIdea[]): MainIdea[] => {
    
    const mapNode = (node: ParsedNode, originalIdea: MainIdea | SubIdea | NestedSubIdea | undefined, level: number): MainIdea | SubIdea | NestedSubIdea => {
        const newIdea: any = {
            id: originalIdea?.id || `${Date.now()}-${Math.random()}`,
            level: level,
            title: node.title,
            content: node.content.trim(),
        };

        if (node.children.length > 0 && level < 3) {
            // Use 'sub_ideas' for children of level 1, and 'nested_sub_ideas' for children of level 2.
            const childrenKey = level === 1 ? 'sub_ideas' : 'nested_sub_ideas';
            const originalChildren = (originalIdea as any)?.[childrenKey] || [];
            
            newIdea[childrenKey] = node.children.map((child, index) => 
                mapNode(child, originalChildren[index], level + 1)
            );
        }
        return newIdea;
    };

    return tree.map((node, index) => 
        mapNode(node, originalIdeas[index], 1) as MainIdea
    );
};


export const generateFinalContentJson = (outlineWithSummaries: Outline): Outline => {
    const finalIdeas: MainIdea[] = [];

    for (const idea of outlineWithSummaries.ideas) {
        if (idea.summary) {
            const parsedTree = parseMarkdownToTree(idea.summary);
            const [newIdea] = mapTreeToOutline(parsedTree, [idea]); // Process one main idea at a time
            if(newIdea) {
                finalIdeas.push(newIdea);
            }
        }
    }
    
    return {
        ...outlineWithSummaries,
        ideas: finalIdeas
    };
};