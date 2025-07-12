export async function fetchRandomIdea(): Promise<string> {
  console.log("🔮 Athena's generating a strategic idea... Channeling ancient wisdom! 🏛️");
  
  try {
    const response = await fetch('/api/quick-generators/fun-idea-generator');
    const data = await response.json() as { idea?: string; error?: string };
    
    if (data.idea) {
      console.log("✨ Athena conjured up:", data.idea.substring(0, 30) + "... Strategic brilliance at its finest!");
      return data.idea;
    } else {
      console.log("🤔 Athena's wisdom engine needs a moment. Even gods need coffee breaks.");
      return 'Error generating idea. Even Athena has her off days!';
    }
  } catch (error) {
    console.error('❌ Athena encountered a strategic challenge:', error);
    return 'Error generating idea. Even Athena has her off days!';
  }
} 