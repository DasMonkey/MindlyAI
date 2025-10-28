# The Prompt API

![Thomas Steiner](https://web.dev/images/authors/thomassteiner.jpg)  
Thomas Steiner  
[GitHub](https://github.com/tomayac) [LinkedIn](https://www.linkedin.com/in/thomassteinerlinkedin) [Mastodon](https://toot.cafe/@tomayac) [Bluesky](https://bsky.app/profile/tomayac.com) [Homepage](https://blog.tomayac.com/)  
![Alexandra Klepper](https://web.dev/images/authors/alexandraklepper.jpg)  
Alexandra Klepper  
[GitHub](https://github.com/alexandrascript) [Bluesky](https://bsky.app/profile/alexandrascript.com)

<br />


Published: May 20, 2025, Last updated: September 21, 2025

<br />

|                         Explainer                          |                                                                                  Web                                                                                  |                                 Extensions                                 |                       Chrome Status                       |                                                  Intent                                                   |
|------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| [GitHub](https://github.com/webmachinelearning/prompt-api) | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/view_trial/2533837740349325313) | ![](https://developer.chrome.com/static/images/chrome_logo.svg) Chrome 138 | [View](https://chromestatus.com/feature/5134603979063296) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/6uBwiiFohAU/m/WhaKAB9fAAAJ) |

With the Prompt API, you can send natural language requests to
[Gemini Nano](https://deepmind.google/technologies/gemini/nano/) in the browser.

There are many ways you can use the Prompt API. For example, you could build:

- **AI-powered search**: Answer questions based on the content of a web page.
- **Personalized news feeds**: Build a feed that dynamically classifies articles with categories and allow for users to filter for that content.
- **Custom content filters**. Analyze news articles and automatically blur or hide content based on user-defined topics.
- **Calendar event creation**. Develop a Chrome Extension that automatically extracts event details from web pages, so users can create calendar entries in just a few steps.
- **Seamless contact extraction**. Build an extension that extracts contact information from websites, making it easier for users to contact a business or add details to their list of contacts.

These are just a few possibilities, and we're excited to see what you create.
**Important** : Gemini Nano is a generative AI model. Before you build with APIs that use Gemini Nano, you should review the [People + AI Guidebook](https://pair.withgoogle.com/guidebook/) for best practices, methods, and examples for designing with AI.  

### Review the hardware requirements

The following requirements exist for developers and the users who operate features using these
APIs in Chrome. Other browsers may have different operating requirements.

The Language Detector and Translator APIs work in Chrome on desktop. These APIs do not work on
mobile devices. The Prompt API, Summarizer API, Writer API, Rewriter API, and Proofreader API work
in Chrome when the following conditions are met:

- **Operating system** : Windows 10 or 11; macOS 13+ (Ventura and onwards); Linux; or ChromeOS (from Platform 16389.0.0 and onwards) on [Chromebook Plus](https://www.google.com/chromebook/chromebookplus/) devices. Chrome for Android, iOS, and ChromeOS on non-Chromebook Plus devices are not yet supported by the APIs which use Gemini Nano.
- **Storage** : At least 22 GB of free space on the volume that contains your Chrome profile. Built-in models should be significantly smaller. The exact size may vary slightly with updates.
- **GPU or CPU** : Built-in models can run with GPU or CPU.
  - **GPU**: Strictly more than 4 GB of VRAM.
  - **CPU**: 16 GB of RAM or more and 4 CPU cores or more.
- **Network** : Unlimited data or an unmetered connection. **Key term** : A [metered connection](https://support.microsoft.com/windows/metered-connections-in-windows-7b33928f-a144-b265-97b6-f2e95a87c408) is a data-limited internet connection. Wi-Fi and ethernet connections tend to be unmetered by default, while cellular connections are often metered.

Gemini Nano's exact size may vary as the browser updates the model. To determine the current size, visit `chrome://on-device-internals`.
| **Note**: If the available storage space falls to less than 10 GB after the download, the model is removed from your device. The model redownloads once the requirements are met.

## Use the Prompt API

The Prompt API uses the Gemini Nano model in Chrome. While the API is built into
Chrome, the model is downloaded separately the first time an origin uses the
API. Before you use this API, acknowledge
[Google's Generative AI Prohibited Uses Policy](https://policies.google.com/terms/generative-ai/use-policy).
| **Note:** Extensions Developers should remove the expired origin trial permissions: `"permissions": ["aiLanguageModelOriginTrial"]`.

To determine if the model is ready to use, call
[`LanguageModel.availability()`](https://developer.chrome.com/docs/ai/get-started#model_download).  

    const availability = await LanguageModel.availability();

| **Caution:** Always pass the same options to the `availability()` function that you use in `prompt()` or `promptStreaming()`. This is critical, as some models may not support certain modalities or languages.

Before the model can be downloaded, there must be a
[user interaction](https://developer.chrome.com/docs/ai/get-started#user-activation), such as a click, tap,
or key press.

If the response was `downloadable` or `downloading`, the model and APIs are
available but must be downloaded before you can use the features. The user must
[interact with the page](https://developer.chrome.com/docs/ai/get-started#user-activation) (such as a
click, tap, or key press) for a download to be permitted.

To download and instantiate the model, call the
[`create()` function](https://developer.chrome.com/docs/ai/prompt-api#create_a_session).  

    const session = await LanguageModel.create({
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Downloaded ${e.loaded * 100}%`);
        });
      },
    });

If the response to `availability()` was `downloading`, listen for
download progress and inform the user, as the download may take time.

### Model parameters

The `params()` function informs you of the language model's parameters. The
object has the following fields:

- `defaultTopK`: The default [top-K](https://ai.google.dev/gemini-api/docs/models/generative-models) value.
- `maxTopK`: The [maximum top-K](https://ai.google.dev/gemini-api/docs/models/generative-models) value.
- `defaultTemperature`: The default [temperature](https://ai.google.dev/gemini-api/docs/models/generative-models).
- `maxTemperature`: The maximum temperature.

    await LanguageModel.params();
    // {defaultTopK: 3, maxTopK: 128, defaultTemperature: 1, maxTemperature: 2}

### Create a session

Once the Prompt API can run, you create a session with the `create()` function.

Each session can be customized with `topK` and `temperature` using an optional
options object. The default values for these parameters are returned from
`LanguageModel.params()`.  

    const params = await LanguageModel.params();
    // Initializing a new session must either specify both `topK` and
    // `temperature` or neither of them.
    const slightlyHighTemperatureSession = await LanguageModel.create({
      temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
      topK: params.defaultTopK,
    });

The `create()` function's optional options object also takes a `signal` field,
which lets you pass an `AbortSignal` to destroy the session.  

    const controller = new AbortController();
    stopButton.onclick = () => controller.abort();

    const session = await LanguageModel.create({
      signal: controller.signal,
    });

### Add context with initial prompts

With initial prompts, you can provide the language model with context about
previous interactions, for example, to allow the user to resume a stored session
after a browser restart.  

    const session = await LanguageModel.create({
      initialPrompts: [
        { role: 'system', content: 'You are a helpful and friendly assistant.' },
        { role: 'user', content: 'What is the capital of Italy?' },
        { role: 'assistant', content: 'The capital of Italy is Rome.' },
        { role: 'user', content: 'What language is spoken there?' },
        {
          role: 'assistant',
          content: 'The official language of Italy is Italian. [...]',
        },
      ],
    });

#### Constrain responses with a prefix

You can add an `"assistant"` role, in addition to previous roles, to elaborate
on the model's previous responses. For example:  

    const followup = await session.prompt([
      {
        role: "user",
        content: "I'm nervous about my presentation tomorrow"
      },
      {
        role: "assistant",
        content: "Presentations are tough!"
      }
    ]);

In some cases, instead of requesting a new response, you may want to
prefill part of the `"assistant"`-role response message. This can be helpful to
guide the language model to use a specific response format. To do this, add
`prefix: true` to the trailing `"assistant"`-role message. For example:  

    const characterSheet = await session.prompt([
      {
        role: 'user',
        content: 'Create a TOML character sheet for a gnome barbarian',
      },
      {
        role: 'assistant',
        content: '```toml\n',
        prefix: true,
      },
    ]);

### Add expected input and output

The Prompt API has [multimodal capabilities](https://developer.chrome.com/docs/ai/prompt-api#multimodal_capabilities) and
supports multiple languages. Set the `expectedInputs` and `expectedOutputs`
modalities and languages when creating your session.

- `type`: Modality expected.
  - For `expectedInputs`, this can be `text`, `image`, or `audio`.
  - For `expectedOutputs`, the Prompt API allows `text` only.
- `languages`: Array to set the language or languages expected. The Prompt API accepts `"en"`, `"ja"`, and `"es"`. Support for additional languages is in development.
  - For `expectedInputs`, set the system prompt language and one or more expected user prompt languages.
  - Set one or more `expectedOutputs` languages.

    const session = await LanguageModel.create({
      expectedInputs: [
        { type: "text", languages: ["en" /* system prompt */, "ja" /* user prompt */] }
      ],
      expectedOutputs: [
        { type: "text", languages: ["ja"] }
      ]
    });

You may receive a `"NotSupportedError"` DOMException if the model encounters
an unsupported input or output.

#### Multimodal capabilities

| **Caution:** Multimodal capabilities are in the Prompt API origin trial for web and Chrome Extensions. These are not yet available in Chrome Stable.

With these capabilities, you could:

- Allow users to transcribe audio messages sent in a chat application.
- Describe an image uploaded to your website for use in a caption or alt text.

Take a look at the
[Mediarecorder Audio Prompt](https://chrome.dev/web-ai-demos/mediarecorder-audio-prompt)
demo for using the Prompt API with audio input and the
[Canvas Image Prompt](https://chrome.dev/web-ai-demos/canvas-image-prompt/) demo
for using the Prompt API with image input.

### Append messages

Inference may take some time, especially when prompting with multimodal inputs.
It can be useful to send predetermined prompts in advance to populate the session,
so the model can get a head start on processing.

While `initialPrompts` are useful at session creation, the `append()` method can be
used in addition to the `prompt()` or `promptStreaming()` methods, to give additional
additional contextual prompts after the session is created.

For example:  

    const session = await LanguageModel.create({
      initialPrompts: [
        {
          role: 'system',
          content:
            'You are a skilled analyst who correlates patterns across multiple images.',
        },
      ],
      expectedInputs: [{ type: 'image' }],
    });

    fileUpload.onchange = async () => {
      await session.append([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              value: `Here's one image. Notes: ${fileNotesInput.value}`,
            },
            { type: 'image', value: fileUpload.files[0] },
          ],
        },
      ]);
    };

    analyzeButton.onclick = async (e) => {
      analysisResult.textContent = await session.prompt(userQuestionInput.value);
    };

The promise returned by `append()` fulfills once the prompt has been validated,
processed, and appended to the session. The promise is rejected if the prompt
cannot be appended.

### Pass a JSON Schema

Add the `responseConstraint` field to `prompt()` or `promptStreaming()` method
to pass a JSON Schema as the value. You can then use
[structured output](https://developer.chrome.com/docs/ai/structured-output-for-prompt-api) with the
Prompt API.

In the following example, the JSON Schema makes sure the model responds with
`true` or `false` to classify if a given message is about pottery.  

    const session = await LanguageModel.create();

    const schema = {
      "type": "boolean"
    };

    const post = "Mugs and ramen bowls, both a bit smaller than intended, but that
    happens with reclaim. Glaze crawled the first time around, but pretty happy
    with it after refiring.";

    const result = await session.prompt(
      `Is this post about pottery?\n\n${post}`,
      {
        responseConstraint: schema,
      }
    );
    console.log(JSON.parse(result));
    // true

Your implementation can include a JSON Schema or regular expression as part of
the message sent to the model. This uses some of the
[input quota](https://developer.chrome.com/docs/ai/prompt-api#session_management). You can measure how much of the input quota
it will use by passing the `responseConstraint` option to
`session.measureInputUsage()`.

You can avoid this behavior with the `omitResponseConstraintInput` option. If
you do so, we recommend that you include some guidance in the prompt:  

    const result = await session.prompt(`
      Summarize this feedback into a rating between 0-5. Only output a JSON
      object { rating }, with a single property whose value is a number:
      The food was delicious, service was excellent, will recommend.
    `, { responseConstraint: schema, omitResponseConstraintInput: true });

## Prompt the model

You can prompt the model with either the `prompt()` or the `promptStreaming()`
functions.

### Non-streamed output

If you expect a short result, you can use the `prompt()` function that returns
the response once it's available.  

    // Start by checking if it's possible to create a session based on the
    // availability of the model, and the characteristics of the device.
    const { defaultTemperature, maxTemperature, defaultTopK, maxTopK } =
      await LanguageModel.params();

    const available = await LanguageModel.availability();

    if (available !== 'unavailable') {
      const session = await LanguageModel.create();

      // Prompt the model and wait for the whole result to come back.
      const result = await session.prompt('Write me a poem!');
      console.log(result);
    }

### Streamed output

If you expect a longer response, you should use the `promptStreaming()` function
which lets you show partial results as they come in from the model. The
`promptStreaming()` function returns a `ReadableStream`.  

    const { defaultTemperature, maxTemperature, defaultTopK, maxTopK } =
      await LanguageModel.params();

    const available = await LanguageModel.availability();
    if (available !== 'unavailable') {
      const session = await LanguageModel.create();

      // Prompt the model and stream the result:
      const stream = session.promptStreaming('Write me an extra-long poem!');
      for await (const chunk of stream) {
        console.log(chunk);
      }
    }

### Stop prompting

Both `prompt()` and `promptStreaming()` accept an optional second parameter with
a `signal` field, which lets you stop running prompts.  

    const controller = new AbortController();
    stopButton.onclick = () => controller.abort();

    const result = await session.prompt('Write me a poem!', {
      signal: controller.signal,
    });

## Session management

Each session keeps track of the context of the conversation. Previous
interactions are taken into account for future interactions until the session's
context window is full.

Each session has a maximum number of tokens it can process. Check your
progress towards this limit with the following:  

    console.log(`${session.inputUsage}/${session.inputQuota}`);

Learn more about [session management](https://developer.chrome.com/docs/ai/session-management).

### Clone a session

To preserve resources, you can clone an existing session with the `clone()`
function. The conversation context is reset, but the initial prompt remains
intact. The `clone()` function takes an optional options object with a `signal`
field, which lets you pass an `AbortSignal` to destroy the cloned session.  

    const controller = new AbortController();
    stopButton.onclick = () => controller.abort();

    const clonedSession = await session.clone({
      signal: controller.signal,
    });

### Terminate a session

Call `destroy()` to free resources if you no longer need a session. When a
session is destroyed, it can no longer be used, and any ongoing execution is
aborted. You may want to keep the session around if you intend to prompt the
model often since creating a session can take some time.  

    await session.prompt(
      "You are a friendly, helpful assistant specialized in clothing choices."
    );

    session.destroy();

    // The promise is rejected with an error explaining that
    // the session is destroyed.
    await session.prompt(
      "What should I wear today? It is sunny, and I am choosing between a t-shirt
      and a polo."
    );

## Demos

We've built multiple demos to explore the many use cases for the Prompt API.
The following demos are web applications:

- [Prompt API playground](https://chrome.dev/web-ai-demos/prompt-api-playground/)
- [Mediarecorder Audio Prompt](https://chrome.dev/web-ai-demos/mediarecorder-audio-prompt)
- [Canvas Image Prompt](https://chrome.dev/web-ai-demos/canvas-image-prompt/)

To test the Prompt API in Chrome Extensions, install the demo extension. The
[extension source code](https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/functional-samples/ai.gemini-on-device)
is available on GitHub.

## Performance strategy

The Prompt API for the web is still being developed. While we build this API,
refer to our best practices on [session management](https://developer.chrome.com/docs/ai/session-management)
for optimal performance.

## Permission Policy, iframes, and Web Workers

By default, the Prompt API is only available to top-level windows and to their
same-origin iframes. Access to the API can be delegated to cross-origin iframes
using the Permission Policy `allow=""` attribute:  

    <!--
      The hosting site at https://main.example.com can grant a cross-origin iframe
      at https://cross-origin.example.com/ access to the Prompt API by
      setting the `allow="language-model"` attribute.
    -->
    <iframe src="https://cross-origin.example.com/" allow="language-model"></iframe>

The Prompt API isn't available in Web Workers for now, due to the complexity of
establishing a responsible document for each worker in order to check the
permissions policy status.

## Participate and share feedback

Your input can directly impact how we build and implement future versions of
this API and all [built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis).

- For feedback on Chrome's implementation, file a [bug report](https://issues.chromium.org/issues/new?component=1583624&priority=P2&type=bug&template=2168238&noWizard=true) or a [feature request](https://issues.chromium.org/issues/new?component=1617227&priority=P2&type=feature_request&template=0&noWizard=true).
- Share your feedback on the API shape by commenting on an existing Issue or by opening a new one in the [Prompt API GitHub repository](https://github.com/webmachinelearning/prompt-api).
- [Join the early preview program](https://developer.chrome.com/docs/ai/join-epp).