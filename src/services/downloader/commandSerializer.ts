/**
 * Neutralino's `os.spawnProcess` accepts one command string and, on Windows,
 * runs it as `cmd.exe /c "<command>"`. This module serializes an executable
 * path plus an argv array for that exact execution path.
 *
 * Quotes are represented as `""` inside a quoted argument. That keeps the
 * argument open from cmd.exe's perspective while CommandLineToArgvW turns the
 * pair into one literal quote. Backslashes before a literal quote or before the
 * closing quote must be doubled so the Windows argv parser does not treat them
 * as quote escapes.
 *
 * `%` is expanded by cmd.exe even inside quotes. Literal percent signs are
 * replaced with a reference to `BILIFLOW_PERCENT`; the process runner supplies
 * that environment variable with the value `%`.
 *
 * `!` is expanded by cmd.exe when delayed expansion is enabled. Each `!` is
 * emitted outside the quoted chunks as `^!`, which produces a literal `!` with
 * delayed expansion both on and off.
 *
 * `^` cannot be passed through cmd.exe with a representation that behaves the
 * same with delayed expansion on and off, so it is rejected instead of risking
 * silent argument corruption or command injection.
 */

export const PERCENT_ENV_VAR = 'BILIFLOW_PERCENT'
export const PERCENT_REFERENCE = `%${PERCENT_ENV_VAR}%`

export type CommandSerializationErrorReason =
  | 'INVALID_EXECUTABLE_PATH'
  | 'UNSUPPORTED_CHARACTER'

export class CommandSerializationError extends Error {
  readonly reason: CommandSerializationErrorReason

  constructor(reason: CommandSerializationErrorReason, message: string) {
    super(message)
    this.name = 'CommandSerializationError'
    this.reason = reason
  }
}

const UNSUPPORTED_ARGUMENT_CHARACTER = /[\u0000-\u001f\u007f^]/

function assertSupportedValue(value: string): void {
  if (UNSUPPORTED_ARGUMENT_CHARACTER.test(value)) {
    throw new CommandSerializationError(
      'UNSUPPORTED_CHARACTER',
      '参数包含无法通过 cmd.exe 安全传递的字符（脱字符或控制字符）。',
    )
  }
}

function quoteChunk(value: string): string {
  let quoted = '"'
  let backslashes = 0

  for (const character of value) {
    if (character === '\\') {
      backslashes += 1
      continue
    }

    if (character === '"') {
      quoted += '\\'.repeat(backslashes * 2)
      quoted += '""'
      backslashes = 0
      continue
    }

    quoted += '\\'.repeat(backslashes)
    quoted += character
    backslashes = 0
  }

  quoted += '\\'.repeat(backslashes * 2)
  quoted += '"'
  return quoted
}

function escapePercentSigns(value: string): string {
  return value.replaceAll('%', PERCENT_REFERENCE)
}

/**
 * Serializes one Windows command-line argument. The returned fragment is not
 * meant to be parsed as an argv array on its own; it is part of a command line
 * executed by cmd.exe.
 */
export function quoteWindowsArgument(value: string): string {
  assertSupportedValue(value)

  if (value.length === 0) {
    return '""'
  }

  const parts = value.split('!')
  let quoted = ''

  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index].length > 0) {
      quoted += quoteChunk(parts[index])
    }

    if (index < parts.length - 1) {
      quoted += '^!'
    }
  }

  return escapePercentSigns(quoted)
}

function isAbsoluteWindowsPath(path: string): boolean {
  return /^(?:[A-Za-z]:\\|\\\\)/.test(path)
}

/**
 * Serializes an absolute Windows executable path and its argv array. The
 * executable is always quoted and must be absolute so it can never be resolved
 * through the current directory or the system PATH.
 */
export function serializeWindowsCommand(
  executablePath: string,
  args: readonly string[],
): string {
  if (
    executablePath.length === 0 ||
    UNSUPPORTED_ARGUMENT_CHARACTER.test(executablePath) ||
    !isAbsoluteWindowsPath(executablePath)
  ) {
    throw new CommandSerializationError(
      'INVALID_EXECUTABLE_PATH',
      'yt-dlp 可执行文件路径无效，必须使用绝对 Windows 路径。',
    )
  }

  return [executablePath, ...args].map(quoteWindowsArgument).join(' ')
}

export function hasPercentReference(command: string): boolean {
  return command.includes(PERCENT_REFERENCE)
}
