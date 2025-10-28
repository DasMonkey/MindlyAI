# Writer API

![Alexandra Klepper](https://web.dev/images/authors/alexandraklepper.jpg)  
Alexandra Klepper  
[GitHub](https://github.com/alexandrascript) [Bluesky](https://bsky.app/profile/alexandrascript.com)  
![Thomas Steiner](https://web.dev/images/authors/thomassteiner.jpg)  
Thomas Steiner  
[GitHub](https://github.com/tomayac) [LinkedIn](https://www.linkedin.com/in/thomassteinerlinkedin) [Mastodon](https://toot.cafe/@tomayac) [Bluesky](https://bsky.app/profile/tomayac.com) [Homepage](https://blog.tomayac.com/)

<br />


Published: May 20, 2025

<br />

|                                  Explainer                                   |                                                                                  Web                                                                                   |                                                                               Extensions                                                                               |                       Chrome Status                       |                                                  Intent                                                   |
|------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| [GitHub](https://github.com/explainers-by-googlers/writing-assistance-apis/) | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/view_trial/-8779204523605360639) | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/view_trial/-8779204523605360639) | [View](https://chromestatus.com/feature/4712595362414592) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/LFaidO_GmIU/m/fwGOKFYPDwAJ) |

The Writer API helps you create new content that conforms to a specified writing
task. The Writer API and the [Rewriter API](https://developer.chrome.com/docs/ai/rewriter) are part of the
[Writing Assistance APIs proposal](https://github.com/explainers-by-googlers/writing-assistance-apis/).

These partner APIs can help you improve content created by users.
| **Important** : Gemini Nano is a generative AI model. Before you build with APIs that use Gemini Nano, you should review the [People + AI Guidebook](https://pair.withgoogle.com/guidebook/) for best practices, methods, and examples for designing with AI.

## Use cases

Write new content, based on your initial idea and optional context. This could
be used to:

- Support users write any kind of content, like reviews, blog posts, or emails.
- Help users write better support requests.
- Draft an introduction for a series of work samples, to better capture certain skills.

Is your use case missing? Join the [early preview program](https://developer.chrome.com/docs/ai/join-epp)
to share your feedback.

## Get started

[Join the Writer API origin trial](https://developer.chrome.com/docs/ai/writer-api#origin-trial) running in Chrome 137 to 142.  

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

### Sign up for the origin trial

The Writer API is available in a joint origin trial with the Rewriter API. To
start using these APIs:

1. Acknowledge [Google's Generative AI Prohibited Uses Policy](https://policies.google.com/terms/generative-ai/use-policy).
2. Go to the [Writer API origin trial](https://developer.chrome.com/origintrials#/view_trial/-8779204523605360639).
3. Click **Register** and fill out the form. In the Web origin field, provide your [origin](https://web.dev/articles/same-site-same-origin#origin) or extension ID, `chrome-extension://YOUR_EXTENSION_ID`.
4. To submit, click **Register**.
5. Copy the token provided, and add it to every participating web page on your origin or include it [in your Extension manifest](https://developer.chrome.com/docs/web-platform/origin-trials#extensions).
6. Start using the Writer and Rewriter APIs.

Learn more about how to [get started with origin trials](https://developer.chrome.com/docs/web-platform/origin-trials).

### Add support to localhost

To access the Writer and Rewriter APIs on localhost during the origin trial, you
must [update Chrome](https://support.google.com/chrome/answer/95414) to the
latest version. Then, follow these steps:

1. Go to `chrome://flags/#writer-api-for-gemini-nano`.
2. Select **Enabled**.
3. Click **Relaunch** or restart Chrome.

## Use the Writer API

First, run feature detection to see if the browser supports these APIs.  

    if ('Writer' in self) {
      // The Writer API is supported.
    }

The Writer API, and all other built-in AI APIs, are integrated in the browser.
Gemini Nano is downloaded separately the first time any website uses a built-in
AI API. In practice, if a user has already interacted with a built-in API, they
have downloaded the model to their browser.

To determine if the model is ready to use, call the asynchronous
[`Writer.availability()`](https://developer.chrome.com/docs/ai/get-started#model-download) function. If
the response to `availability()` is `downloadable`, listen for download progress
and inform the user, as the download may take time.  

    const availability = await Writer.availability();

To trigger model download and start the writer, check for
[user activation](https://developer.chrome.com/docs/ai/get-started#user-activation)
and call the `Writer.create()` function.  

    const writer = await Writer.create({
      monitor(m) {
        m.addEventListener("downloadprogress", e => {
          console.log(`Downloaded ${e.loaded * 100}%`);
        });
      }
    });

### API functions

The `create()` function lets you configure a new writer object. It takes an
optional `options` object with the following parameters:

- `tone`: [Writing tone](https://owl.purdue.edu/owl/multilingual/multilingual_students/key_concepts_for_writing_in_north_american_colleges/style_genre_and_writing.html) can refer to the style, character, or attitude of the content. The value can be set to `formal`, `neutral` (default), or `casual`.
- `format`: The output formatting, with the allowed values `markdown` (default) and `plain-text`.
- `length`: The length of the output, with the allowed values `short`, `medium` (default), and `long`.
- `sharedContext`: When writing [multiple outputs](https://developer.chrome.com/docs/ai/writer-api#multiple-tasks), a shared context can help the model create content better aligned with your expectations.

| **Note:** Once set, the parameters can't be changed. Create a new writer object if you need to modify the parameters.

The following example demonstrates how to initiate a `writer` object:  

    const options = {
      sharedContext: 'This is an email to acquaintances about an upcoming event.',
      tone: 'casual',
      format: 'plain-text',
      length: 'medium',
    };

    const available = await Writer.availability();
    let writer;
    if (available === 'unavailable') {
      // The Writer API isn't usable.
      return;
    }
    if (available === 'available') {
      // The Writer API can be used immediately .
      writer = await Writer.create(options);
    } else {
      // The Writer can be used after the model is downloaded.
      const writer = await Writer.create({
        ...options,
        monitor(m) {
          m.addEventListener("downloadprogress", e => {
            console.log(`Downloaded ${e.loaded * 100}%`);
          });
        }
      });
    }

### Assign expected languages

The Writer API supports multiple languages. Set the expected input and context
languages as well as the expected output language when creating your session.
This allows the browser to reject the request if the
browser cannot support a specific language combination.  

    const writer = await Writer.create({
      tone: "formal",
      expectedInputLanguages: ["en", "ja", "es"],
      expectedContextLanguages: ["en", "ja", "es"],
      outputLanguage: "es",
      sharedContext: "These are requests to write messages to teachers in a Spanish
        language program, by students who may speak Spanish, Japanese, or English.
        Staff expect questions to be written in Spanish."
    });

### Start writing

There are two ways to output writing from the model: non-streaming and streaming.

#### Non-streaming output

With non-streaming writing, the model processes the input as a whole and then
produces the output.

To get a non-streaming output, call the asynchronous `write()` function. You
must include a prompt for the content you want written. You can add an optional
`context` to provide the model background information, which may help the model
better meet your expectations for the output.  

    // Non-streaming
    const writer = await Writer.create();
    const result = await writer.write(
      "An inquiry to my bank about how to enable wire transfers on my account.", {
        context: "I'm a longstanding customer",
      },
    );

#### Stream writing output

Streaming offers results in real-time. The output updates continuously as the
input is added and adjusted.

To get a streaming writer, call the `writeStreaming()` function and iterate
over the available segments of text in the stream. You can add an optional
`context` to provide the model background information, which may help the model
better meet your expectations for the output.  

    // Streaming
    const writer = await Writer.create(
      expectedInputLanguages: ["en"],
      expectedContextLanguages: ["en"],
      outputLanguage: "en",
    );
    const stream = writer.writeStreaming(
      "An inquiry to my bank about how to enable wire transfers on my account.", {
        context: "I'm a longstanding customer",
      },
    );
    for await (const chunk of stream) {
      composeTextbox.append(chunk);
    }

#### Share context for multiple tasks

You may want to use a `writer` to generate multiple pieces of content. In this
case, it's useful to add `sharedContext`. For example, you may want to help
reviewers give better feedback in comments.  

    // Shared context and per writing task context
    const writer = await Writer.create({
        expectedInputLanguages: ["en"],
        expectedContextLanguages: ["en"],
        outputLanguage: "en",
        sharedContext:
          "This is for publishing on [popular website name], a business" +
          "and employment-focused social media platform."
    });

    const stream = writer.writeStreaming(
      "Write a blog post about how I love all this work on gen AI at Google!" +
      "Mention that there's so much to learn and so many new things I can do!",
      { context: " The request comes from someone working at a startup providing an e-commerce CMS solution."}
    );

    for await (const chunk of stream) {
      composeTextbox.append(chunk);
    }

#### Reuse a writer

You can use the same writer to create multiple pieces of content.  

    // Reuse a writer
    const writer = await Writer.create({ tone: "formal" });

    const reviews = await Promise.all(
      Array.from(
        document.querySelectorAll("#reviews > .review"),
        (reviewEl) => writer.write(reviewEl.textContent)
      ),
    );

#### Stop the writer

To end the writing process, abort the controller and destroy the writer.  

    // Aborting a writer
    const controller = new AbortController();
    stopButton.onclick = () => controller.abort();

    const writer = await Writer.create({ signal: controller.signal });
    await writer.write(reviewEl.textContent, { signal: controller.signal });

    // Destroying a writer
    writer.destroy();

## Demo

## Permission Policy, iframes, and Web Workers

By default, the Writer API is only available to top-level windows and to their
same-origin iframes. Access to the API can be delegated to cross-origin iframes
using the Permission Policy `allow=""` attribute:  

    <!--
      The hosting site at https://main.example.com can grant a cross-origin iframe
      at https://cross-origin.example.com/ access to the Writer API by
      setting the `allow="writer"` attribute.
    -->
    <iframe src="https://cross-origin.example.com/" allow="writer"></iframe>

The Writer API isn't available in Web Workers. This is due to the
complexity of establishing a responsible document for each worker in order to
check the Permissions Policy status.

## Engage and share feedback

The Writer and [Rewriter API](https://developer.chrome.com/docs/ai/rewriter-api) are under active discussion
and subject to change in the future. If you try this API and have feedback,
we'd love to hear it.

- [Read the explainer](https://github.com/explainers-by-googlers/writing-assistance-apis/), raise questions and participate in discussion.
- Review the implementation for Chrome on [Chrome Status](https://chromestatus.com/feature/4712595362414592).
- [Join the early preview program](https://developer.chrome.com/docs/ai/join-epp) for an early look at new APIs and access to our mailing list.
- If you have feedback on Chrome's implementation, file a [Chromium bug](https://new.crbug.com/).

Discover all of the [built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis) which use models,
including [Gemini Nano](https://deepmind.google/technologies/gemini/nano/)
and other expert models, in the browser.