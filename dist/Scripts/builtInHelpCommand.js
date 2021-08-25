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
import { Command } from "../Structures/Command";
import * as Discord from "discord.js";
export function builtInHelpCommand(client) {
    return new Command({
        name: "help",
        description: "Shows a help embed",
        aliases: ["help"],
        permissions: ["SEND_MESSAGES"],
        category: "other",
        args: [
            {
                name: "command",
                description: "The command to get information on",
                type: "string",
                required: false
            }
        ],
        type: "BOTH",
        slashCommandOptions: [
            {
                name: "command",
                description: "The command to get information on",
                type: "STRING",
                required: false
            }
        ]
    }, (message, args, client, command) => {
        const embed = new Discord.MessageEmbed(client.builtInHelpCommand);
        embed.setTitle(`${client.user.username}: Help`);
        if (command && command instanceof Command) {
            embed
                .setDescription(`Info about the \`${command.name}\` command.`)
                .addFields({
                name: "Description",
                value: command.description ||
                    "No description provided.",
                inline: false
            }, {
                name: "Arguments",
                value: [
                    `\`${client.getCommandUsage(command, message.guild)}\`\n`,
                    ...command.args.map(v => `\`${v?.name} (${v?.type}${v?.required ? "" : ", optional"})\`: ${v?.description ??
                        "No description provided."}`)
                ].join("\n") || "None",
                inline: false
            }, {
                name: "Types",
                value: [
                    ...new Set(command.args.map(v => `\`${v.type}\`: ${client.converterAlias[v.type]}`))
                ].join("\n") || "No arguments for this command",
                inline: false
            }, {
                name: "Category",
                value: pascalCase(command.category || "None"),
                inline: true
            }, {
                name: "Permissions",
                value: command.permissions
                    .map(v => typeof v == "string"
                    ? v
                        .toLowerCase()
                        .split(/_+/)
                        .map(v2 => camelCase(v2))
                        .join(" ")
                    : "Permissions Object")
                    .join(", ") || "None",
                inline: true
            }, {
                name: "Slash Command",
                value: command.isSlash() ? "Enabled" : "Disabled",
                inline: true
            }, {
                name: "Aliases",
                value: command.aliases.join(", ") || "None",
                inline: true
            });
        }
        else
            embed.addFields(client.commandCategories
                .filter(v => v != null)
                .map(v => {
                return {
                    name: v[0].toUpperCase() +
                        v.slice(1).toLowerCase(),
                    value: client.commands
                        .filter(v2 => v2.category == v)
                        .map(v2 => `\`${v2.name}\`: ${v2.description}\n`)
                        .join(" ")
                };
            }));
        try {
            message.reply("Sending a help embed now!");
            message.author.send({ embeds: [embed] });
        }
        catch {
            message.reply({ embeds: [embed] });
        }
    });
}
function pascalCase(string) {
    return string[0].toUpperCase() + string.substring(1);
}
function camelCase(string) {
    return string[0].toLowerCase() + string.substring(1);
}
