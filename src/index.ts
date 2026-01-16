#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { analyzeSite } from "./analyzer/site-analyzer.js";
import { discoverArticles } from "./analyzer/blog-discovery.js";
import { planArticles } from "./planner/article-planner.js";
import { generateArticles } from "./generator/article-writer.js";
import { getConfig } from "./utils/config.js";
import { version } from "../package.json" with { type: "json" };

const program = new Command();

program
  .name("blog-builder")
  .description("AI-powered blog content strategy and generation tool")
  .version(version);

program
  .command("analyze <url>")
  .description("Analyze a website and generate blog-plan.md")
  .option("-o, --output <dir>", "Output directory")
  .option("-v, --verbose", "Verbose output")
  .action(async (url: string, options) => {
    const spinner = ora("Analyzing website...").start();
    try {
      const config = getConfig(options);
      const result = await analyzeSite(url, config);
      spinner.succeed(chalk.green("Site analysis complete!"));
      console.log(chalk.cyan(`\nBlog plan saved to: ${result.planPath}`));
    } catch (error) {
      spinner.fail(chalk.red("Analysis failed"));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

program
  .command("discover <url>")
  .description("Discover existing blog articles on the site")
  .option("-o, --output <dir>", "Output directory")
  .option("-v, --verbose", "Verbose output")
  .action(async (url: string, options) => {
    const spinner = ora("Discovering blog articles...").start();
    try {
      const config = getConfig(options);
      const result = await discoverArticles(url, config);
      spinner.succeed(chalk.green(`Found ${result.articles.length} articles!`));
      console.log(chalk.cyan(`\nArticles saved to: ${result.inventoryPath}`));
    } catch (error) {
      spinner.fail(chalk.red("Discovery failed"));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

program
  .command("plan <url>")
  .description("Generate content strategy and article briefs")
  .option("-o, --output <dir>", "Output directory")
  .option("-c, --count <number>", "Number of articles to plan", "10")
  .option("-t, --topics <topics>", "Comma-separated topics to focus on")
  .option("-v, --verbose", "Verbose output")
  .action(async (url: string, options) => {
    const spinner = ora("Planning content strategy...").start();
    try {
      const config = getConfig(options);
      const result = await planArticles(url, config);
      spinner.succeed(chalk.green(`Planned ${result.articles.length} articles!`));
      console.log(chalk.cyan(`\nPlan saved to: ${result.planPath}`));
    } catch (error) {
      spinner.fail(chalk.red("Planning failed"));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

program
  .command("generate <url>")
  .description("Generate articles from existing plan")
  .option("-o, --output <dir>", "Output directory")
  .option("-c, --count <number>", "Number of articles to generate")
  .option("-v, --verbose", "Verbose output")
  .action(async (url: string, options) => {
    const spinner = ora("Generating articles...").start();
    try {
      const config = getConfig(options);
      const result = await generateArticles(url, config);
      spinner.succeed(chalk.green(`Generated ${result.articles.length} articles!`));
      console.log(chalk.cyan(`\nArticles saved to: ${result.outputPath}`));
    } catch (error) {
      spinner.fail(chalk.red("Generation failed"));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

program
  .command("run <url>")
  .description("Full pipeline: analyze → discover → plan → generate")
  .option("-o, --output <dir>", "Output directory")
  .option("-c, --count <number>", "Number of articles to generate", "10")
  .option("-t, --topics <topics>", "Comma-separated topics to focus on")
  .option("-v, --verbose", "Verbose output")
  .action(async (url: string, options) => {
    console.log(chalk.bold.cyan("\n🚀 Blog Builder - Full Pipeline\n"));

    const config = getConfig(options);
    let spinner: ReturnType<typeof ora>;

    try {
      // Step 1: Analyze
      spinner = ora("Step 1/4: Analyzing website...").start();
      const analysis = await analyzeSite(url, config);
      spinner.succeed(chalk.green("Site analysis complete"));

      // Step 2: Discover
      spinner = ora("Step 2/4: Discovering existing articles...").start();
      const discovery = await discoverArticles(url, config);
      spinner.succeed(chalk.green(`Found ${discovery.articles.length} existing articles`));

      // Step 3: Plan
      spinner = ora("Step 3/4: Planning new content...").start();
      const plan = await planArticles(url, config);
      spinner.succeed(chalk.green(`Planned ${plan.articles.length} new articles`));

      // Step 4: Generate
      spinner = ora("Step 4/4: Generating articles...").start();
      const generated = await generateArticles(url, config);
      spinner.succeed(chalk.green(`Generated ${generated.articles.length} articles`));

      // Summary
      console.log(chalk.bold.green("\n✅ Pipeline complete!\n"));
      console.log(chalk.cyan("Output directory:"), generated.outputPath);
      console.log(chalk.cyan("Blog plan:"), analysis.planPath);
      console.log(chalk.cyan("Articles generated:"), generated.articles.length);
    } catch (error) {
      console.error(chalk.red("\n❌ Pipeline failed:"), (error as Error).message);
      process.exit(1);
    }
  });

program.parse();
