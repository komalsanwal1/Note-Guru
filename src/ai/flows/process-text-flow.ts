
'use server';
/**
 * @fileOverview Processes text by simplifying, summarizing, or generating Q&A, with options for different formats
 * and iterative refinement. Includes an AI-generated heading. Uses HTML <strong> tags for bolding.
 *
 * - processText - A function that handles the text processing and refinement.
 * - ProcessTextInput - The input type for the processText function.
 * - ProcessTextOutput - The return type for the processText function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const ProcessTextInputSchema = z.object({
  text: z.string().describe('The text to be processed.'),
  mode: z.enum(['simplify', 'summarize', 'generate_qa']).describe('The processing mode: simplify, summarize, or generate Q&A.'),
  format: z.enum(['bullet_points', 'story_format']).describe('The desired output format (bullet_points or story_format).'),
  previousProcessedText: z.string().optional().describe('The previously processed text body, if this is a refinement step.'),
  previousHeading: z.string().optional().describe('The previously generated heading, if this is a refinement step.'),
  refinementInstruction: z.string().optional().describe('The user instruction for refining the text or heading (e.g., "make it shorter", "explain the first point", "change heading to X").')
});
export type ProcessTextInput = z.infer<typeof ProcessTextInputSchema>;

const ProcessTextOutputSchema = z.object({
  generatedHeading: z.string().describe('A concise and relevant heading for the processed text, using <strong> tags for emphasis if appropriate. HTML <strong> tags MUST be used for any bold text.'),
  processedText: z.string().describe('The processed (simplified, summarized, Q&A) or refined text in the specified format. It should be well-formatted without excessive newlines. HTML <strong> tags MUST be used for any bold text.'),
});
export type ProcessTextOutput = z.infer<typeof ProcessTextOutputSchema>;

export async function processText(input: ProcessTextInput): Promise<ProcessTextOutput> {
  return processTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processTextPrompt',
  input: {schema: ProcessTextInputSchema},
  output: {schema: ProcessTextOutputSchema},
  prompt: `You are an AI expert in text processing and study material generation.
When you generate text that requires emphasis or bolding, you MUST use HTML <strong> tags (e.g., <strong>This is important</strong>). Do NOT use Markdown like **important** or __important__.

{{#if refinementInstruction}}
You are refining previously processed content.
The original text (for context, if needed) was:
{{{text}}}

The previous processed content had the heading:
<strong>{{{previousHeading}}}</strong>

And the body (which was {{mode_verb}} into {{format_description}}) was:
{{{previousProcessedText}}}

The user's refinement instruction for the body or heading is:
{{{refinementInstruction}}}

Please provide the new, refined heading and body, keeping the same format ({{format_description}}) for the body. If the refinement instruction clearly implies a change to the heading, update it; otherwise, you can keep the previous heading.
{{{commonInstructions}}}
Output the (potentially new) heading and the refined processed text according to the output schema. Ensure all bold text uses <strong> tags.
{{else}}
First, create a concise and relevant <strong>heading</strong> for the processed content. The heading itself can use <strong> tags for emphasis if appropriate (NOT Markdown).
Then, {{mode_prompt_action}} the following text into <strong>{{{format_description}}}</strong>. Ensure all bold text uses <strong> tags (NOT Markdown).

Text: {{{text}}}

{{#if is_simplify_bullet_points}}
  Instructions for content: Generate <strong>hyper-detailed</strong>, comprehensive, and informative bullet points. Each main bullet point must be thoroughly explained and significantly detailed, exploring the concept in depth. Use sub-bullets extensively to break down complex aspects, provide examples, and add layers of information. The goal is to produce an advanced level of understanding. Ensure the notes are exceptionally comprehensive and richly informative. All bold text MUST use <strong> tags. Do not use Markdown.
{{/if}}
{{#if is_simplify_story_format}}
  Instructions for content: Create an engaging narrative that explains the core concepts from the text clearly and thoroughly. Ensure the story is engaging and explains the core concepts clearly. All bold text MUST use <strong> tags. Do not use Markdown.
{{/if}}
{{#if is_summarize_bullet_points}}
  Instructions for content: Generate comprehensive and informative summary bullet points. Each bullet point should be well-explained and detailed. Sub-bullets can be used for further detail if it helps clarity and depth. The summary should be a thorough representation of the original notes. All bold text MUST use <strong> tags. Do not use Markdown.
{{/if}}
{{#if is_summarize_story_format}}
  Instructions for content: Create an engaging narrative that accurately captures the key information and concepts from the notes. The story should be detailed enough to be informative while remaining coherent and easy to follow. All bold text MUST use <strong> tags. Do not use Markdown.
{{/if}}
{{#if is_generate_qa_bullet_points}}
  Instructions for content: Generate question and answer pairs based on the text. Format each as a bullet point starting with <strong>Question:</strong> followed by the question, and on a new line within the same bullet, <strong>Answer:</strong> followed by the answer. Ensure the questions cover key concepts and the answers are accurate and derived from the text. All bold text (like "Question:" and "Answer:") MUST use <strong> tags. Do not use Markdown.
{{/if}}
{{#if is_generate_qa_story_format}}
  Instructions for content: Create an engaging narrative that includes questions about the core concepts from the text and provides their answers within the story. Clearly distinguish questions and answers. All bold text MUST use <strong> tags. Do not use Markdown.
{{/if}}

{{{commonInstructions}}}
Output the generated heading and the processed text according to the output schema.
{{/if}}`,
});

const processTextFlow = ai.defineFlow(
  {
    name: 'processTextFlow',
    inputSchema: ProcessTextInputSchema,
    outputSchema: ProcessTextOutputSchema,
  },
  async (input: ProcessTextInput) => {
    let mode_verb = '';
    let mode_prompt_action = '';
    switch (input.mode) {
      case 'simplify':
        mode_verb = 'simplified';
        mode_prompt_action = '<strong>simplify</strong>';
        break;
      case 'summarize':
        mode_verb = 'summarized';
        mode_prompt_action = '<strong>summarize</strong>';
        break;
      case 'generate_qa':
        mode_verb = 'processed for Q&A';
        mode_prompt_action = '<strong>generate Q&A from</strong>';
        break;
      default:
        mode_verb = 'processed';
        mode_prompt_action = '<strong>process</strong>';
    }

    const promptInput = {
      ...input,
      mode_verb,
      mode_prompt_action,
      format_description: input.format === 'bullet_points' ? 'bullet points' : 'a story format',
      is_simplify_bullet_points: input.mode === 'simplify' && input.format === 'bullet_points',
      is_simplify_story_format: input.mode === 'simplify' && input.format === 'story_format',
      is_summarize_bullet_points: input.mode === 'summarize' && input.format === 'bullet_points',
      is_summarize_story_format: input.mode === 'summarize' && input.format === 'story_format',
      is_generate_qa_bullet_points: input.mode === 'generate_qa' && input.format === 'bullet_points',
      is_generate_qa_story_format: input.mode === 'generate_qa' && input.format === 'story_format',
      commonInstructions: "Ensure clarity, accuracy, and appropriate detail. Remember: ALL bold text MUST use HTML <strong> tags. DO NOT use Markdown (e.g., **text** or __text__). Format the output cleanly with minimal unnecessary blank lines.",
    };
    const {output} = await prompt(promptInput);

    if (output) {
      if (output.processedText) {
        let cleanedText = output.processedText.trim(); 
        // Normalize all newline types to \n
        cleanedText = cleanedText.replace(/\r\n|\r/g, '\n');
        // Remove lines that are empty or contain only whitespace
        cleanedText = cleanedText.replace(/^\s*$/gm, '');
        // Consolidate multiple newlines (2 or more) into exactly two newlines (one blank line)
        cleanedText = cleanedText.replace(/\n{2,}/g, '\n\n');
        // Trim again to remove any leading/trailing newlines that might have been created
        cleanedText = cleanedText.trim();
        output.processedText = cleanedText;
      }
      if (output.generatedHeading) {
        output.generatedHeading = output.generatedHeading.trim();
      }
    }
    
    return output!;
  }
);

