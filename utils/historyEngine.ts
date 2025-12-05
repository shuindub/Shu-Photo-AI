
import { HistoryItem, HistoryStep, AppTab } from '../types';

export const exportHistoryToJson = (history: HistoryItem[], projectName: string = 'ShuPhotoAI') => {
  if (!history || history.length === 0) {
      downloadJson([], projectName);
      return;
  }

  // Convert Internal History (Newest First) to Export History (Chronological)
  // We reverse the array to get steps 1...N in order of creation.
  const chronologicalHistory = [...history].reverse();

  const exportSteps: HistoryStep[] = chronologicalHistory.map((item, index) => {
    let modelOutput = item.modelOutput || '';
    let imageInputs: string[] | undefined = undefined;
    let imageOutputs: string[] | undefined = undefined;

    // Map fields based on item type
    switch (item.type) {
        case AppTab.TEXT2IMAGE:
            modelOutput = modelOutput || `Generated ${item.results.length} images`;
            imageOutputs = item.results;
            break;
        case AppTab.IMAGE2IMAGE:
        case AppTab.ENCH_UPSCL:
            modelOutput = modelOutput || `Processed ${item.results.length} images`;
            imageInputs = (item as any).inputImages;
            imageOutputs = item.results;
            break;
        case AppTab.IMAGE2TEXT:
            imageInputs = (item as any).inputImages;
            // modelOutput is already set for IMAGE2TEXT if available in the history item
            break;
        case AppTab.FRAME2IMAGE:
            modelOutput = `Extracted frames from video: ${(item as any).videoName}`;
            imageOutputs = item.results;
            break;
    }

    // Sanitize undefined arrays to undefined (so they don't appear as empty keys if logic dictates) 
    // or keep them undefined so JSON.stringify skips them if that's preferred. 
    // The requirement says "if available", so undefined is fine.

    return {
      step: index + 1,
      timestamp: new Date(item.timestamp).toISOString(),
      userInput: item.prompt,
      modelOutput: modelOutput,
      imageInputs: imageInputs,
      imageOutputs: imageOutputs
    };
  });

  downloadJson(exportSteps, projectName);
};

const downloadJson = (data: any, projectName: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `history_${projectName}_${timestamp}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
