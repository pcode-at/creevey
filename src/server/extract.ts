import { writeFileSync } from 'fs';
import { Config, noop, Options, isFunction, isObject } from '../types';
import { subscribeOn } from './messages';
import { loadTestsFromStories, storybookApi } from './stories';
import { removeProps } from './utils';

export default async function extract(config: Config, options: Options): Promise<void> {
  if (process.env.__CREEVEY_ENV__ != 'test') {
    await new Promise<void>((resolve, reject) => {
      subscribeOn('webpack', (message) => {
        switch (message.type) {
          case 'success':
            return resolve();
          case 'fail':
            return reject();
        }
      });
      void (async () => (await import('./webpack')).default(config, options))();
    });
  }

  const tests = await loadTestsFromStories({ browsers: Object.keys(config.browsers), watch: false }, noop);

  if (options.extract == 'tests') {
    writeFileSync(
      'tests.json',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      JSON.stringify(tests, (_, value) => (isFunction(value) ? value.toString() : value), 2),
    );
  } else {
    const storiesData = storybookApi?.clientApi.store().getStoriesJsonData();
    removeProps(storiesData ?? {}, ['stories', () => true, 'parameters', '__isArgsStory']);
    Object.values(storiesData?.stories ?? {}).forEach(
      (story) =>
        isObject(story) && 'parameters' in story && isObject(story.parameters) && delete story.parameters.__isArgsStory,
    );
    writeFileSync('stories.json', JSON.stringify(storiesData, null, 2));
  }
  // eslint-disable-next-line no-process-exit
  process.exit(0);
}