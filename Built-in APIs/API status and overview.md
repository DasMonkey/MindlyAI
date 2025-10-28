# Built-in AI APIs

![Alexandra Klepper](https://web.dev/images/authors/alexandraklepper.jpg)  
Alexandra Klepper  
[GitHub](https://github.com/alexandrascript) [Bluesky](https://bsky.app/profile/alexandrascript.com)

<br />


Published: August 27, 2024, Last updated: September 12, 2025

<br />

Before you use these APIs, review the
[usage requirements](https://developer.chrome.com/docs/ai/get-started#requirements).
| **Important** : Gemini Nano is a generative AI model. Before you build with APIs that use Gemini Nano, you should review the [People + AI Guidebook](https://pair.withgoogle.com/guidebook/) for best practices, methods, and examples for designing with AI.

## API status

There are several built-in AI APIs available at different stages of development.
Some APIs are in Chrome Stable, others are available to all developers in
[origin trials](https://developer.chrome.com/docs/web-platform/origin-trials), and some are only
available to Early Preview Program (EPP) participants.

[Join the EPP](https://developer.chrome.com/docs/ai/join-epp) to get first access to the latest
experimental APIs. This step is not required to join origin trials,
use stable APIs, or access websites or extensions using
built-in AI.

|                                                API                                                |                                        Explainer                                        |                                                                                   Web                                                                                   |                                                                               Extensions                                                                                |                       Chrome Status                       |                                                  Intent                                                   |
|---------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| [Translator API](https://developer.chrome.com/docs/ai/built-in-apis#translator_api)               | [MDN](https://developer.mozilla.org/docs/Web/API/Translator_and_Language_Detector_APIs) | ![](https://developer.chrome.com/static/images/chrome_logo.svg) Chrome 138                                                                                              | ![](https://developer.chrome.com/static/images/chrome_logo.svg) Chrome 138                                                                                              | [View](https://chromestatus.com/feature/5172811302961152) | [Intent to Ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/eCE8jIW2auo/m/3vMI6eQqBAAJ)       |
| [Language Detector API](https://developer.chrome.com/docs/ai/built-in-apis#language_detector_api) | [MDN](https://developer.mozilla.org/docs/Web/API/Translator_and_Language_Detector_APIs) | ![](https://developer.chrome.com/static/images/chrome_logo.svg) Chrome 138                                                                                              | ![](https://developer.chrome.com/static/images/chrome_logo.svg) Chrome 138                                                                                              | [View](https://chromestatus.com/feature/6494349985841152) | [Intent to Ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/sWcHBe9wpbo/m/H8Xp7NXTCQAJ)       |
| [Summarizer API](https://developer.chrome.com/docs/ai/built-in-apis#summarizer_api)               | [MDN](https://developer.mozilla.org/docs/Web/API/Summarizer/)                           | ![](https://developer.chrome.com/static/images/chrome_logo.svg) Chrome 138                                                                                              | ![](https://developer.chrome.com/static/images/chrome_logo.svg) Chrome 138                                                                                              | [View](https://chromestatus.com/feature/5193953788559360) | [Intent to Ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/cpyB56aHWs4/m/8NTdmGV8AAAJ)       |
| [Writer API](https://developer.chrome.com/docs/ai/built-in-apis#writer_and_rewriter_apis)         | [GitHub](https://github.com/explainers-by-googlers/writing-assistance-apis/)            | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/view_trial/-8779204523605360639)  | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/view_trial/-8779204523605360639)  | [View](https://chromestatus.com/feature/4712595362414592) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/LFaidO_GmIU/m/fwGOKFYPDwAJ) |
| [Rewriter API](https://developer.chrome.com/docs/ai/built-in-apis#writer_and_rewriter_apis)       | [GitHub](https://github.com/explainers-by-googlers/writing-assistance-apis/)            | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/view_trial/444167513249415169)    | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/view_trial/444167513249415169)    | [View](https://chromestatus.com/feature/5112320150470656) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/LgPGLOV2vrc/m/1crxL0oPDwAJ) |
| [Prompt API](https://developer.chrome.com/docs/ai/built-in-apis#prompt_api)                       | [GitHub](https://github.com/webmachinelearning/prompt-api)                              | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/view_trial/2533837740349325313)   | ![](https://developer.chrome.com/static/images/chrome_logo.svg) Chrome 138                                                                                              | [View](https://chromestatus.com/feature/5134603979063296) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/6uBwiiFohAU/m/WhaKAB9fAAAJ) |
| [Proofreader API](https://developer.chrome.com/docs/ai/built-in-apis#proofreader_api)             | [GitHub](https://github.com/explainers-by-googlers/proofreader-api)                     | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/registration/2794008579760193537) | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/registration/2794008579760193537) | [View](https://chromestatus.com/feature/5164677291835392) | [Intent to Prototype](https://groups.google.com/a/chromium.org/g/blink-dev/c/1waIrgpXrRs/m/dFySNRrDBgAJ)  |

| **Key Term:** An *explainer* is a document that describes a proposed web platform feature or collection of features. As work progresses, explainers facilitate discussion and, hopefully, consensus around the approach and feature design. Explainers are updated as design progresses.

## Translator API

The [Translator API](https://developer.chrome.com/docs/ai/translator-api) is available from Chrome 138
stable. Translate user-generated and dynamic content on request.

### Use cases

- Users can enter a request in their first language, which you can identify with the Language Detector API. Then, use the Translator API to convert the request to your business operating language and send it to a support agent.
- In a social network application, users can request a translation on-demand when a post appears on their timeline in a language they don't speak.

## Language Detector API

The [Language Detector API](https://developer.chrome.com/docs/ai/language-detection) is available from
Chrome 138 stable. You can use this API to detect the language of input text.
This is a key part of the translation process, as you may not always know the
input language for translation.

### Use cases

Language detection has several use cases:

- Determining the unknown source language for a following translation to a known target language, so the user doesn't have to specify both.
- Labeling texts, for example, to improve screen reader pronunciation in online social networking sites.

## Summarizer API

The [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api) is available from
Chrome 138 stable. With this API, you can condense long-form content.
Shorter content can be more accessible and useful to users.

### Use cases

There are a number of use cases for summarization:

- Overview of a meeting transcript for those joining the meeting late or those who missed the meeting entirely.
- Key points from support conversations for customer relationship management.
- Sentence or paragraph-sized [summaries of multiple product reviews](https://developer.chrome.com/docs/ai/evaluate-reviews).
- Key points from long articles, to help readers determine if the article is relevant.
- Generating draft titles for an article.
- Summarizing questions in a forum to help experts find those which are most relevant to their field of expertise.

## Writer and Rewriter APIs

The [Writer API](https://developer.chrome.com/docs/ai/writer-api) helps you create new content that
conforms to a specified writing task, while the
[Rewriter API](https://developer.chrome.com/docs/ai/rewriter-api) helps revise and restructure text.
Both APIs are part of the
[Writing Assistance APIs explainer](https://github.com/explainers-by-googlers/writing-assistance-apis/).

Help this proposal move to the next stage by
[indicating your support](https://github.com/WICG/proposals/issues/163)
with a thumbs-up reaction or by commenting with details about your use
cases and context.

### Use cases

There are a number of use cases for writing and rewriting:

- Write based on an initial idea and optional context. For example, a formal email to a bank asking to increase the credit limit based on the context that you're a long-term customer.
- Refine existing text by making it longer or shorter, or changing the tone. For example, you could rewrite a short email so that it sounds more polite and formal.

Do you have additional ideas for these APIs? Share them with us on
[GitHub](https://github.com/explainers-by-googlers/writing-assistance-apis/issues).

## Prompt API

With the [Prompt API](https://developer.chrome.com/docs/ai/prompt-api), origin trial participants can send
natural language requests to Gemini Nano in Chrome.

### In Chrome Extensions

With the [Prompt API in Chrome Extensions](https://developer.chrome.com/docs/extensions/ai/prompt-api), you
can experiment in a real environment. Based on your findings, we can refine
the API to better address real-world use cases.

The Prompt API is available from Chrome 138 stable, only for Chrome Extensions.

## Proofreader API

The [Proofreader API](https://developer.chrome.com/docs/ai/proofreader-api) is available in an origin trial.
With this API, you can provide interactive proofreading for your users in your
web application or Chrome Extension.

### Use cases

You could use the Proofreader API for any of the following use cases:

- Correct a document the user is editing in their browser.
- Help your customers send grammatically correct chat messages.
- Edit comments on a blog post or forum.
- Provide corrections in note taking applications.

## Participate in early testing

We use your feedback to shape the future of these APIs, to confirm that they
meet the needs of developers and users.

Join our [Early Preview Program](https://developer.chrome.com/docs/ai/join-epp) to
experiment with early-stage built-in AI APIs.