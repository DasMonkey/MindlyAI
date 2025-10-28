# Best practices for session management with the Prompt API

![Thomas Steiner](https://web.dev/images/authors/thomassteiner.jpg)  
Thomas Steiner  
[GitHub](https://github.com/tomayac) [LinkedIn](https://www.linkedin.com/in/thomassteinerlinkedin) [Mastodon](https://toot.cafe/@tomayac) [Bluesky](https://bsky.app/profile/tomayac.com) [Homepage](https://blog.tomayac.com/)

<br />


Published: January 27, 2025

<br />

|                         Explainer                          |                                                                                  Web                                                                                  |                                 Extensions                                 |                       Chrome Status                       |                                                  Intent                                                   |
|------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| [GitHub](https://github.com/webmachinelearning/prompt-api) | ![Origin trial](https://developer.chrome.com/static/images/experiment.svg) [Origin trial](https://developer.chrome.com/origintrials/#/view_trial/2533837740349325313) | ![](https://developer.chrome.com/static/images/chrome_logo.svg) Chrome 138 | [View](https://chromestatus.com/feature/5134603979063296) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/6uBwiiFohAU/m/WhaKAB9fAAAJ) |

One key feature of the [Prompt API](https://developer.chrome.com/docs/ai/prompt-api) is sessions.
They let you have one or multiple ongoing conversations with the AI model,
without the model losing track of the context of what was said. This guide
introduces best practices for session management with the language model.

You may want to engage in session management for one or more parallel sessions
if you're building a classic chatbot, where one user interacts with AI. Or, if
you have a customer relationship management systems where one support agent
deals with multiple customers in parallel and makes use of AI to help the
support agent keep track of the various conversations.

## Initialize sessions with an initial prompt

An *initial prompt* sets up the context of the session at the start. For
example, you can use the initial prompt to tell the model how it should respond.  

    const languageModel = await LanguageModel.create({
      initialPrompts: [{
        role: 'system',
        content: 'You are a helpful assistant and you speak like a pirate.'
      }],
    });
    console.log(await languageModel.prompt('Tell me a joke.'));
    // 'Avast ye, matey! What do you call a lazy pirate?\n\nA **sail-bum!**\n\nAhoy
    // there, me hearties!  Want to hear another one? \n'

## Clone a main session

If you want to start a new session after a session ends, or if you want to have
multiple independent conversations in parallel, you can clone a main session.

The clone inherits session parameters, such as `temperature` or `topK`, and any
session interaction history. This is useful if, for example, you initialized
the main session with a initial prompt. This way, your app only needs to do this
work once---all clones inherit the initial prompt from the main session.  

    const languageModel = await LanguageModel.create({
      initialPrompts: [{
        role: 'system',
        content: 'You are a helpful assistant and you speak like a pirate.'
      }]
    });

    // The original session `languageModel` remains unchanged, and
    // the two clones can be interacted with independently from each other.
    const firstClonedLanguageModel = await languageModel.clone();
    const secondClonedLanguageModel = await languageModel.clone();
    // Interact with the sessions independently.
    await firstClonedLanguageModel.prompt('Tell me a joke about parrots.');
    await secondClonedLanguageModel.prompt('Tell me a joke about treasure troves.');
    // Each session keeps its own context.
    // The first session's context is jokes about parrots.
    await firstClonedLanguageModel.prompt('Tell me another.');
    // The second session's context is jokes about treasure troves.
    await secondClonedLanguageModel.prompt('Tell me another.');

## Restore a past session

With *initial prompts* , you can prime the model with a set of example prompts
and responses, to generate better results. This is often used in
*n-shot prompting*, to create responses that mirror your expectations.
| **Note:** There's a feature request to [restore sessions](https://github.com/webmachinelearning/prompt-api/issues/50), but until then, this creative usage of initial prompts works.

If you keep track of ongoing conversations with the model, you can use this
practice to restore a session. For example, after a browser restarts, you can
help your user continue engaging with the model from where they left off.
One approach is to keep track of session history in local storage.  

    // Restore the session from localStorage, or initialize a new session.
    // The UUID is hardcoded here, but would come from a
    // session picker in your user interface.
    const uuid = '7e62c0e0-6518-4658-bc38-e7a43217df87';

    function getSessionData(uuid) {
      try {
        const storedSession = localStorage.getItem(uuid);
        return storedSession ? JSON.parse(storedSession) : false;
      } catch {
        return false;
      }
    }

    let sessionData = getSessionData(uuid);

    // Initialize a new session.
    if (!sessionData) {
      // Get the current default parameters so they can be restored as they were,
      // even if the default values change in the future.
      const { defaultTopK, defaultTemperature } =
        await LanguageModel.params();
      sessionData = {
        initialPrompts: [],
        topK: defaultTopK,
        temperature: defaultTemperature,
      };
    }

    // Initialize the session with the (previously stored or new) session data.
    const languageModel = await LanguageModel.create(sessionData);

    // Keep track of the ongoing conversion and store it in localStorage.
    const prompt = 'Tell me a joke';
    try {
      const stream = languageModel.promptStreaming(prompt);
      let result = '';
      // You can already work with each `chunk`, but then store
      // the final `result` in history.
      for await (const chunk of stream) {
        // In practice, you'd render the chunk.
        console.log(chunk);
        result = chunk;
      }

      sessionData.initialPrompts.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: result },
      );

      // To avoid growing localStorage infinitely, make sure to delete
      // no longer used sessions from time to time.
      localStorage.setItem(uuid, JSON.stringify(sessionData));
    } catch (err) {
      console.error(err.name, err.message);
    }

| **Tip:** Use the [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api) initialized with a `type: 'headline'` options field to automatically give each session a human-readable session title.

## Preserve session quota by letting the user stop the model

Each session has a context window that you can see by accessing the session's
relevant fields `inputQuota` and `inputUsage`.  

    const { inputQuota, inputUsage } = languageModel;
    const inputQuotaLeft = inputQuota - inputUsage;

When this context window is exceeded, it causes the session to lose track of the
oldest messages. This may lead to worse results if the context was important.
To preserve quota, if a user determines the model's answer isn't useful,
allow them to stop the session with `AbortController`.

Both the `prompt()` and the `promptStreaming()` methods accept an optional
second parameter with a `signal` field, to allow the user to stop the session.  

    const controller = new AbortController();
    stopButton.onclick = () => controller.abort();

    try {
      const stream = languageModel.promptStreaming('Write me a poem!', {
        signal: controller.signal,
      });
      for await (const chunk of stream) {
        console.log(chunk);
      }
    } catch (err) {
      // Ignore `AbortError` errors.
      if (err.name !== 'AbortError') {
        console.error(err.name, err.message);
      }
    }

## Remove unused sessions

Each session consumes memory. If you have started several
large sessions, this may become a problem.
[Destroy unused sessions](https://developer.chrome.com/docs/ai/prompt-api#terminate_a_session) to raise
resource availability.
| **Note:** The model is unloaded after a period of time if there are no living sessions. Thus, you likely want to keep one empty session alive at a time, as it uses limited memory and keeps the model ready to use. Empty sessions should be removed and replaced as other sessions are created, so resources are available for their full potential.

## Demo

See AI session management in action in the
[AI session management demo](https://chrome.dev/web-ai-demos/ai-session-management/).
Create multiple parallel conversations with the Prompt API, reload the tab or
even restart your browser, and continue where you left off. See the
[source code on GitHub](https://github.com/GoogleChromeLabs/web-ai-demos/tree/main/ai-session-management).  

## Unlock the full potential of the Prompt API

By thoughtfully managing AI sessions with these techniques and best practices,
you can unlock the full potential of the Prompt API, delivering more efficient,
responsive, and user-centric applications. You can also combine these
approaches, for example, by letting the user clone a restored past session, so
they can run "what if" scenarios.

### Acknowledgements

This guide was reviewed by
[Sebastian Benz](https://www.linkedin.com/in/sebastianbenz/),
[Andre Bandarra](https://bandarra.me/),
[François Beaufort](https://github.com/beaufortfrancois), and
[Alexandra Klepper](https://bsky.app/profile/alexandrascript.com).