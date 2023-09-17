const config = require('../config.json')
const { spawn } = require('child_process');
const { Octokit } = require('octokit');
const term = require('terminal-kit').terminal;

const runStuff = () => {
    return new Promise((resolve) => {
        const npmStart = spawn('npm', ['start'], {
            shell: true, stdio: 'inherit'
        });

        npmStart.on('close', () => {
            resolve();
        });
    });
};


(async () => {
    const octokit = new Octokit({ auth: config.GithubToken });

    term.cyan(`[${new Date().toLocaleString('Us', { hour12: false })} Server] Started\n`);

    const { data: { object: { sha: FirstSha } } } = await octokit.rest.git.getRef({
        owner: config.RepoOwner,
        repo: config.RepoName,
        ref: config.RepoBranch
    });

    await runStuff();

    let lastCommit = FirstSha;

    if (config.commitStrings) {
        const Pushing = spawn('git', ['add', '.', '&&', 'git', 'commit', '-m', `"${config.commitsMsg}"`, '&&', 'git', 'push'], {
            shell: true, stdio: 'inherit'
        });

        Pushing.on('close', () => {
            term.cyan(`[${new Date().toLocaleString('Us', { hour12: false })} Server] Pushed\n`);
        });
    }

    setInterval(async () => {
        const { data: { object: { sha } } } = await octokit.rest.git.getRef({
            owner: config.RepoOwner,
            repo: config.RepoName,
            ref: config.RepoBranch
        });

        if (lastCommit === sha) {
            term.cyan(`[${new Date().toLocaleString('Us', { hour12: false })} Server] No Changes\n`);
            return;
        }

        lastCommit = sha;

        await new Promise((resolve) => setTimeout(resolve, 1000)); // just for github sometimes being dumb and providing the wrong file

        await runStuff();

        term.cyan(`[${new Date().toLocaleString('Us', { hour12: false })} Server] Comment Created\n`);

        if (config.commitStrings) {
            const Pushing = spawn('git', ['add', '.', '&&', 'git', 'commit', '-m', `"${config.commitsMsg}"`, '&&', 'git', 'push'], {
                shell: true, stdio: 'inherit'
            });

            Pushing.on('close', () => {
                term.cyan(`[${new Date().toLocaleString('Us', { hour12: false })} Server] Pushed\n`);
            });
        }

    }, Number(config.Interval));

})();