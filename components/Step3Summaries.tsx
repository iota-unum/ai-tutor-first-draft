
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outline, MainIdea, SubIdea, NestedSubIdea } from '../types';

interface Step3SummariesProps {
  finalContentJson: string;
  outlineWithSummariesJson: string;
  subject: string;
  onConfirm: (editedJson: string) => void;
  onGoBack: () => void;
}

const createFileName = (title: string, extension: string): string => {
    const sanitized = title.replace(/[\\?%*:|"<>]/g, '_').replace(/\s+/g, '-').toLowerCase();
    return `${sanitized || 'download'}.${extension}`;
};

const countWords = (text: string): number => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const getTotalWordCount = (outline: Outline | null): number => {
  if (!outline) return 0;
  let totalWords = 0;
  const traverse = (nodes: any[]) => {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.content) {
        totalWords += countWords(node.content);
      }
      if (node.sub_ideas) traverse(node.sub_ideas);
      if (node.nested_sub_ideas) traverse(node.nested_sub_ideas);
    }
  };
  traverse(outline.ideas);
  return totalWords;
};

const ContentEditor: React.FC<{
  idea: MainIdea | SubIdea | NestedSubIdea;
  onContentChange: (newContent: string) => void;
}> = React.memo(({ idea, onContentChange }) => {
  return (
    <textarea
      value={idea.content || ''}
      onChange={(e) => onContentChange(e.target.value)}
      className="w-full h-24 p-2 mt-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-1 focus:ring-purple-500 text-gray-300"
      aria-label="Content editor"
    />
  );
});

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return <p className="text-gray-500 p-4">No content available for this section.</p>;
  
  return (
    <div className="prose prose-sm md:prose-base prose-invert max-w-none text-left bg-gray-900 p-4 rounded-b-lg">
      {content.split('\n').map((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-purple-300">{trimmedLine.substring(4)}</h3>;
        }
        if (trimmedLine.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold mt-6 mb-2 text-purple-300 border-b border-gray-600 pb-1">{trimmedLine.substring(3)}</h2>;
        }
        if (trimmedLine.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-8 mb-3 text-purple-200">{trimmedLine.substring(2)}</h1>;
        }
        if (trimmedLine === '') {
          return null; // Don't render empty paragraphs for blank lines
        }
        return <p key={index} className="my-2 leading-relaxed">{trimmedLine}</p>;
      })}
    </div>
  );
};


export const Step3Summaries: React.FC<Step3SummariesProps> = ({ finalContentJson, outlineWithSummariesJson, subject, onConfirm, onGoBack }) => {
  const [outline, setOutline] = useState<Outline | null>(null);
  const [outlineWithSummaries, setOutlineWithSummaries] = useState<Outline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tabs' | 'editor'>('tabs');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    try {
      if (finalContentJson) {
        setOutline(JSON.parse(finalContentJson));
      }
      if (outlineWithSummariesJson) {
        setOutlineWithSummaries(JSON.parse(outlineWithSummariesJson));
      }
      setError(null);
    } catch (e) {
      setError("Invalid JSON data. Cannot display structured view.");
    }
  }, [finalContentJson, outlineWithSummariesJson]);

  const wordCount = useMemo(() => getTotalWordCount(outline), [outline]);

  const handleContentChange = useCallback((path: (string | number)[], newContent: string) => {
    setOutline(currentOutline => {
      if (!currentOutline) return null;
      const newOutline = JSON.parse(JSON.stringify(currentOutline));
      let currentLevel: any = newOutline;
      for (let i = 0; i < path.length - 1; i++) {
        currentLevel = currentLevel[path[i]];
      }
      currentLevel[path[path.length - 1]].content = newContent;
      return newOutline;
    });
  }, []);

  const renderEditorView = () => {
    if (!outline) return null;
    
    const renderIdeas = (ideas: (SubIdea | NestedSubIdea)[], parentPath: (string | number)[], level = 1) => (
      <div className={`${level > 1 ? 'pl-4 border-l-2 border-gray-600' : ''}`}>
        {ideas.map((idea, index) => {
          const currentPath = [...parentPath, index];
          const children = (idea as SubIdea).nested_sub_ideas;
          return (
            <div key={idea.id} className="mt-3">
              {React.createElement(`h${level + 2}`, { className: "font-semibold text-gray-200" }, idea.title)}
              <ContentEditor idea={idea} onContentChange={(newContent) => handleContentChange(currentPath, newContent)} />
              {children && children.length > 0 && renderIdeas(children, [...currentPath, 'nested_sub_ideas'], level + 1)}
            </div>
          );
        })}
      </div>
    );

    return (
        <div className="w-full space-y-4 max-h-[60vh] overflow-y-auto p-2">
            {outline.ideas.map((idea, index) => (
            <details key={idea.id} className="bg-gray-700 rounded-lg p-4" open={index === 0}>
                <summary className="font-bold text-xl cursor-pointer text-purple-300">{idea.title}</summary>
                <div className="mt-2">
                    <p className="text-sm text-gray-400 italic mb-2">Main idea content:</p>
                    <ContentEditor idea={idea} onContentChange={(newContent) => handleContentChange(['ideas', index], newContent)} />
                </div>
                {idea.sub_ideas && idea.sub_ideas.length > 0 && (
                <div className="mt-4">{renderIdeas(idea.sub_ideas, ['ideas', index, 'sub_ideas'])}</div>
                )}
            </details>
            ))}
        </div>
    )
  };

  const renderTabsView = () => {
    if (!outlineWithSummaries) return null;
    return (
        <div className="w-full">
            <div className="flex border-b border-gray-600 overflow-x-auto">
                {outlineWithSummaries.ideas.map((idea, index) => (
                    <button
                        key={idea.id}
                        onClick={() => setActiveTab(index)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors -mb-px border-b-2 ${activeTab === index ? 'border-purple-500 text-purple-300' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        {idea.title}
                    </button>
                ))}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
                {outlineWithSummaries.ideas.map((idea, index) => (
                    <div key={idea.id} className={activeTab === index ? 'block' : 'hidden'}>
                        <MarkdownRenderer content={idea.summary || ''} />
                    </div>
                ))}
            </div>
        </div>
    );
  };
  
  const handleDownload = () => {
    if (!outlineWithSummaries) return;
    const fullMarkdown = outlineWithSummaries.ideas
        .map(idea => idea.summary || '')
        .join('\n\n---\n\n');
    
    const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = createFileName(`${subject}-summary`, 'md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getUpdatedJsonString = () => outline ? JSON.stringify(outline, null, 2) : finalContentJson;

  if (error) return <div className="text-red-400 text-center">{error}</div>;
  if (!outline) return <div className="text-gray-400 text-center">Loading structured summaries...</div>;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-2">
          <h2 className="text-2xl font-semibold text-left">Step 3: Review & Edit Summaries</h2>
          <div className="text-sm font-mono bg-gray-900 px-3 py-1 rounded-md border border-gray-700">
              Words: <span className="font-bold text-purple-400">{wordCount}</span>
          </div>
      </div>
      <p className="text-gray-400 mb-6 text-center max-w-lg">
        Review and edit the content for each point. You can use the "Reading View" for a clean overview or the "Editor View" to make changes.
      </p>
      
      <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <div className="inline-flex rounded-md shadow-sm bg-gray-900 p-1">
            <button onClick={() => setViewMode('tabs')} className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${viewMode === 'tabs' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                Reading View
            </button>
            <button onClick={() => setViewMode('editor')} className={`px-4 py-2 text-sm font-medium rounded-r-md transition-colors ${viewMode === 'editor' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                Editor View
            </button>
        </div>
        <button
            onClick={handleDownload}
            disabled={!outlineWithSummaries}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm inline-flex items-center gap-2 disabled:bg-gray-600"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            Download (.md)
        </button>
      </div>

      {viewMode === 'tabs' ? renderTabsView() : renderEditorView()}

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mt-8">
        <button
          onClick={onGoBack}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all"
        >
          Go Back
        </button>
        <button
          onClick={() => onConfirm(getUpdatedJsonString())}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all transform hover:scale-105"
        >
          Confirm & Generate Content
        </button>
      </div>
    </div>
  );
};
