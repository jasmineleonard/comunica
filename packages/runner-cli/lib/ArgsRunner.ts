/* eslint-disable no-process-env,unicorn/no-process-exit */
import type { IActorOutputInit } from '@comunica/bus-init';
import type { ActionContext } from '@comunica/core';
import type { ISetupProperties } from '@comunica/runner';
import { run } from '@comunica/runner';

export function runArgs(configResourceUrl: string, argv: string[], stdin: NodeJS.ReadStream,
  stdout: NodeJS.WriteStream, stderr: NodeJS.WriteStream, exit: (code?: number) => void, env: NodeJS.ProcessEnv,
  runnerUri?: string, properties?: ISetupProperties, context?: ActionContext): void {
  run(configResourceUrl, { argv, env, stdin, context }, runnerUri, properties)
    .then((results: IActorOutputInit[]) => {
      results.forEach((result: IActorOutputInit) => {
        if (result.stdout) {
          result.stdout.on('error', error => {
            stderr.write(`${error.message}\n`);
            exit(1);
          });
          result.stdout.pipe(stdout);
          result.stdout.on('end', () => {
            exit(0);
          });
        }
        if (result.stderr) {
          result.stderr.on('error', error => {
            stderr.write(`${error.message}\n`);
            exit(1);
          });
          result.stderr.pipe(stderr);
          result.stderr.on('end', () => {
            exit(1);
          });
        }
      });
    }).catch((error: Error) => {
      stderr.write(`${error.message}\n`);
      exit(1);
    });
}

export function runArgsInProcess(
  moduleRootPath: string,
  defaultConfigPath: string,
  options?: { context?: ActionContext; onDone?: () => void },
): void {
  const argv = process.argv.slice(2);
  runArgs(
    process.env.COMUNICA_CONFIG ? `${process.cwd()}/${process.env.COMUNICA_CONFIG}` : defaultConfigPath,
    argv,
    process.stdin,
    process.stdout,
    process.stderr,
    (code?: number) => {
      if (options?.onDone) {
        options?.onDone();
      }
      if (code !== 0) {
        process.exit(code);
      }
    },
    process.env,
    undefined,
    {
      mainModulePath: moduleRootPath,
    },
    options?.context,
  );
}

export function runArgsInProcessStatic(actor: any, options?: { context?: ActionContext; onDone?: () => void }): void {
  const argv = process.argv.slice(2);
  actor.run({ argv, env: process.env, stdin: process.stdin, context: options?.context })
    .then((result: IActorOutputInit) => {
      if (result.stdout) {
        result.stdout.on('error', error => {
          process.stderr.write(`${error.message}\n`);
          if (options?.onDone) {
            options?.onDone();
          }
          process.exit(1);
        });
        result.stdout.pipe(process.stdout);
        result.stdout.on('end', () => {
          if (options?.onDone) {
            options?.onDone();
          }
        });
      }
      if (result.stderr) {
        result.stderr.on('error', error => {
          process.stderr.write(`${error.message}\n`);
          if (options?.onDone) {
            options?.onDone();
          }
          process.exit(1);
        });
        result.stderr.pipe(process.stderr);
        result.stderr.on('end', () => {
          if (options?.onDone) {
            options?.onDone();
          }
          process.exit(1);
        });
      }
    })
    .catch((error: Error) => {
      process.stderr.write(`${error.message}\n`);
      if (options?.onDone) {
        options?.onDone();
      }
      process.exit(1);
    });
}
