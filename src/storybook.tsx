import React from "react";
import ReactDOM from "react-dom";
import addons, { makeDecorator, StoryContext, StoryGetter } from "@storybook/addons";
import { getStorybook, addParameters } from "@storybook/react";
import { StoriesRaw, WithCreeveyParameters } from "./types";

export type StoriesRawOld = Partial<{
  [id: string]: {
    id: string;
    name: string;
    kind: string;
    parameters: { creevey?: WithCreeveyParameters };
    render: Function;
  };
}>;
export type StoryDidMountCallback = (context?: StoryContext) => void;

interface CreeveyStoryWrapperProps {
  context?: StoryContext;
  onDidMount: StoryDidMountCallback;
}

class CreeveyStoryWrapper extends React.Component<CreeveyStoryWrapperProps> {
  componentDidMount() {
    const { context, onDidMount } = this.props;

    if (!context) return onDidMount();

    const {
      hooks,
      parameters: { component, ...restParameters },
      ...restContext
    } = context;
    onDidMount({ parameters: restParameters, ...restContext });
  }

  render() {
    return this.props.children;
  }
}

export function withCreevey(parameters: WithCreeveyParameters = {}) {
  function selectStory(storyId: string, kind: string, name: string, callback: StoryDidMountCallback) {
    storyDidMountCallback = callback;
    // NOTE Hack to trigger force re-render same story
    addons.getChannel().emit("setCurrentStory", { storyId: true, name, kind });
    setTimeout(() => addons.getChannel().emit("setCurrentStory", { storyId, name, kind }), 100);
  }
  let storyDidMountCallback: StoryDidMountCallback = () => {};
  let stories: StoriesRaw = {};

  addParameters({ creevey: parameters });

  addons.getChannel().once("setStories", (data: { stories: StoriesRaw }) => {
    Object.entries(data.stories).forEach(([storyId, story]) => {
      const {
        // @ts-ignore prop hooks exists in runtime
        hooks,
        parameters: { component, ...restParameters },
        ...restStory
      } = story;
      stories[storyId] = { parameters: restParameters, ...restStory };
    });
  });
  // @ts-ignore
  window.__CREEVEY_GET_STORIES__ = callback => callback(stories);
  // @ts-ignore
  window.__CREEVEY_SELECT_STORY__ = selectStory;

  return makeDecorator({
    name: "withCreevey",
    parameterName: "creevey",
    // TODO what data exists in settings argument?
    wrapper(getStory, context, _settings) {
      return (
        <CreeveyStoryWrapper context={context} onDidMount={storyDidMountCallback}>
          {getStory(context)}
        </CreeveyStoryWrapper>
      );
    }
  });
}

export function withCreeveyOld(parameters: WithCreeveyParameters = {}) {
  function selectStory(storyId: string, _kind: string, _name: string, callback: StoryDidMountCallback) {
    const story = stories[storyId];

    ReactDOM.unmountComponentAtNode(root);

    if (story) {
      ReactDOM.render(<CreeveyStoryWrapper onDidMount={callback}>{story.render()}</CreeveyStoryWrapper>, root);
    }
  }
  let stories: StoriesRawOld = {};
  const root = document.getElementById("root") as HTMLElement;

  // @ts-ignore
  window.__CREEVEY_GET_STORIES__ = callback => {
    getStorybook().forEach(kind => {
      kind.stories.forEach(story => {
        const storyId = `${kind.kind}--${story.name}`.toLowerCase();
        stories[storyId] = {
          id: storyId,
          name: story.name,
          kind: kind.kind,
          render: story.render,
          parameters: { creevey: parameters }
        };
      });
    });

    callback(stories);
  };
  // @ts-ignore
  window.__CREEVEY_SELECT_STORY__ = selectStory;

  return (getStory: StoryGetter, context: StoryContext) => getStory(context);
}
