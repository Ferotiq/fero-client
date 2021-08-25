/**
 * MIT License
 *
 * Copyright (c) 2021 Ferotiq
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @format
 */
import * as Discord from "discord.js";
import { Command } from "./Command.js";
import "colors";
interface HelpCommandStyle extends Discord.MessageEmbedOptions {
    slashCommand: boolean;
}
interface Paths {
    config: string;
    commands: string;
    events: string;
}
declare type ArgumentType = "string" | "mstring" | "char" | "number" | "int" | "float" | "boolean" | "color" | "guild" | "member" | "user" | "channel" | "message" | "invite" | "emoji" | "role" | "permission" | "time" | "command";
declare type Argument = {
    name: string;
    description: string;
    required: boolean;
    type: ArgumentType;
};
declare type Perm = Discord.PermissionString | Discord.Permissions | string;
declare type Permission = Perm | Perm[];
declare type PrefixCollection = Discord.Collection<string | Discord.Guild, string> | [string | Discord.Guild, string][] | Map<string | Discord.Guild, string>;
export declare class Client extends Discord.Client {
    private console;
    commands: Discord.Collection<string, Command>;
    commandCategories: string[];
    discord: typeof Discord;
    defaultPrefix: string;
    prefixes: Discord.Collection<string, string>;
    commandLoadedMessage: boolean;
    eventLoadedMessage: boolean;
    emitMessageOnInteraction: boolean;
    builtInHelpCommand: HelpCommandStyle;
    deleteUnusedSlashCommands: boolean;
    paths: Paths;
    modules: object;
    permissionData: object;
    private constructors;
    converterAlias: {
        string: string;
        mstring: string;
        char: string;
        number: string;
        int: string;
        float: string;
        boolean: string;
        color: string;
        guild: string;
        member: string;
        user: string;
        channel: string;
        message: string;
        invite: string;
        emoji: string;
        role: string;
        permission: string;
        time: string;
        command: string;
    };
    constructor(paths: Paths, modules?: object);
    reload(): Promise<string>;
    checkPermissions(permissions: Permission[], member: Discord.GuildMember): boolean;
    private checkPermission;
    runCommand(command: Command, message: Discord.Message, args: string[]): Promise<void>;
    getParameters(command: Command): Argument[];
    getCommandsFromCategory(category: string): Discord.Collection<string, Command>;
    getCommandUsage(command: Command, guild?: Discord.Guild): string;
    prefix(guild?: Discord.Guild | string): string;
    loadPrefixes(...iterators: PrefixCollection[]): Discord.Collection<string, string>;
}
export {};
