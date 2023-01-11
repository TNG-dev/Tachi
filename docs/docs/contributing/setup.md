# Setting up a Local Development Environment

Before you can contribute to Tachi, it'll help to have a functional setup on your machine.

You don't *necessarily* need to have a working install to contribute - you could easily
make documentation contributions without having anything running on your machine - but
it's extremely helpful to be able to run Tachi's things while working on them.

## 0. Unix Necessary!

You *must* be on some Unix-Like operating system. That ideally means means Linux, MacOS or WSL.

!!! info
	This is because of Redis, mainly. We also depend on the `sendmail` binary to send emails around, which might be even less portable.
	
	Also - we use Linux in production, and your local
	environment should be as close to production as reasonably possible.

### I'm on Windows, help!

Don't worry. You can run Linux as a subsystem inside Windows, without any virtual machine
nonsense. It's a bit of a headache to get sorted, but Microsoft provide a decent [setup guide](https://docs.microsoft.com/en-us/windows/wsl/install-win10).

!!! danger
	You can pick your own Linux distro to use when setting up WSL2.

	**YOU MUST PICK UBUNTU LATEST (22.04) UNLESS YOU KNOW EXACTLY WHAT YOU ARE DOING**. Anything else will likely have *ancient*
	versions of software installed, and will cause some obscene headaches.

	**UBUNTU 20.04 LTS HAS A SIGNIFICANTLY-TOO-OLD VERSION OF GIT. DO NOT USE IT.**

### I'm on Mac.

Everything should work out of the box.

### I'm on Linux.

Tachi has been tested on Ubuntu, Debian, Arch and Manjaro. There's no reason it won't run on any Linux variant, but
if you're running something willfully obtuse like Artix or Slackware, you'll probably hit problems. Figure it out yourself.

The happiest path for the below guide is for Arch/Manjaro users. For other distros, you
might find getting some of the services running a bit cumbersome. Ah well.

## 0.5. Get some developer tools.

If you're an experienced programmer, you won't need this bit.

### Editor

You'll need an editor to work in!

If you've only done a bit of programming in school,
you might be used to something like Visual Studio.

Sadly, Visual Studio is *not* a great editor for a codebase like Tachi. Visual Studio is
really good at writing C# (a language we don't use at all),
but its integration with TypeScript (the language we use) is quite poor.

We **highly** recommend that you get [VSCode](https://code.visualstudio.com/). Especially
if you're a beginner! It's an extremely good editor, and has remarkably good integration
with everything we use.

### Terminal

You'll need a terminal to run commands in. For Linux and Mac users, you can just open
a Terminal app.

However, for Windows users we recommend installing the [Windows Terminal](https://apps.microsoft.com/store/detail/windows-terminal/9N0DX20HK701?hl=en-gb&gl=GB). It integrates well with WSL2, which is what you'll have to use.

Anyway, with a terminal open you can proceed to the next steps!

### Understanding the Terminal

If you're completely unfamiliar with the terminal, check out our [Terminal Guide](./tools/terminal.md). We'll be assuming you know terminal basics in the below instructions.

## 1. Getting Node, PNPM and Docker.

You'll need `node` to run JavaScript code on your machine. Our codebase is wrote in JS, so this is pretty important.

Because system package managers may have outdated versions of `node` available (we want Node 16), we're going to use a separate tool called `nvm` to manage our node installs.

Follow [these instructions](https://github.com/nvm-sh/nvm#install--update-script).

Then close and re-open your shell to apply the changes. We can now install node16
```sh
# install node 16
nvm install 16

# Check it worked
node --version
```

We use `pnpm` instead of `npm`. To get `pnpm`, you'll need to run:

```sh
# You might need `sudo` to run this command.
npm install -g pnpm
```

We use MongoDB and Redis as databases, these external databases require radically different instructions for setup depending on what OS/Linux variant you're on.

As such, we're going to take the lazy route and use something called [Docker](https://docker.com).

=== "Windows, WSL Ubuntu"
	You should install [Docker Desktop](https://docs.docker.com/desktop/) instead.
	Docker doesn't work well inside WSL.

=== "Debian"
	[Please use the official Docker install guide.](https://docs.docker.com/engine/install/debian/)

=== "Ubuntu"
	[Please use the official Docker install guide.](https://docs.docker.com/engine/install/ubuntu/)

=== "Arch, Manjaro"
	```sh
	sudo pacman -S docker docker-compose
	```

=== "MacOS"
	```sh
	brew install docker docker-compose
	```

!!! info
	Docker is like a VM[^1]. It runs an entire Linux box to contain your software in, and generally sidesteps the whole "works on my machine" problem, by just shipping the entire machine.

## 2. Fork and pull the repo.

Since you can't just commit straight to someone elses codebase (that would be a massive security issue), you need to make a fork of Tachi - One owned by you!

Go to [the Tachi repository](https://github.com/TNG-dev/Tachi) and click the Fork button in the top right (Make sure you're signed in).

Now, back to the terminal:

!!! tip
	It's good organisation to make a folder on your PC for codestuffs.
	
	If you do that, make sure you open the terminal in that folder,
	so your Tachi repo will save there!

```sh
# This will create a folder called Tachi on your PC.
# It'll create it wherever your terminal is currently open in.
git clone https://github.com/YOUR_GITHUB_USERNAME/Tachi

# Open this repository in VSCode!
code Tachi
```

## 3. Authenticate with Github.

You'll need to authenticate with GitHub before you can actually push changes back
to your repository.

There's a remarkably easy way to do this, using GitHub's `gh` tool.

=== "Debian, Ubuntu, WSL Ubuntu"
	[Use the official Linux instructions.](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)

=== "Arch, Manjaro"
	```sh
	sudo pacman -S gh
	```

=== "MacOS"
	```sh
	brew install gh
	```

Once you've installed it, type `gh auth` and follow the instructions.
You should now be properly authenticated!

## 4. Start the databases.

Before we bootstrap, lets get the databases started.

!!! important
	**You should be inside the Tachi folder you just cloned.**

```sh
# you can write either docker compose or docker-compose. However, the former might
# require you to restart your shell if you've just installed docker compose.
docker-compose up --detach
```

## 5. Bootstrap!

!!! warning
	The bootstrap script is a fairly recent addition.

	If you have any issues with it, please report them!

Using a terminal, run `_scripts/bootstrap.sh`. This will "bootstrap" your install of Tachi, and load
everything you need.

!!! danger
	The bootstrap script you just ran created some local self-signed HTTPS certificates.

	Browsers (rightfully) tell you that these are not actually secure HTTPS certs.
	We need them for local development, though.

	You **need** to navigate to your running instance of the server in a browser, and tell
	the browser that you trust these certificates. Otherwise, all client requests to
	the server will silently be chomped by the browser.

## 6. That's it!

You now have a fully working instance of Tachi on your PC. You can now start to tinker
with all of its various components.

To check everything's gone soundly, run `pnpm start-server` and `pnpm start-client`.

!!! tip
	You can use the `+` inside the VSCode terminal to spawn multiple terminals.

	Remember that `Ctrl-C` will kill the currently active process. You should use that
	to stop the server or client.

You should then be able to navigate to https://127.0.0.1:8080, accept the certificates,
and view the client on http://127.0.0.1:3000.

!!! warning
	You **MUST** accept the certificates on https://127.0.0.1:8080. The client **will not** start otherwise.

!!! help
	If you're getting an `SSL_RX_RECORD_TOO_LONG` error, you're trying to access the client
	via https. The client is served over HTTP - use http://127.0.0.1:3000.

## 7. Editor Plugins

If you're using VSCode as your editor (I *really* recommend it!) You'll want a couple
plugins.

Namely, Install the ESLint plugin, and enable "Format On Save" in your settings. We use an [incredibly strict](https://github.com/CadenceJS/Cadence) plugin for ESLint, which catches a *ton* of programming errors and mistakes. By having it run in your editor, you can see your mistakes before you ever run the code, and have them automatically fix on save!

!!! tip
	With `Ctrl-Shift-P`, you can open VSCodes "Command Palette". This will let you search
	for all the possible things VSCode can do. To open the settings, you can use `Ctrl-Shift-P` and search for "Settings".

	It's ridiculously convenient, and there's a bunch of other stuff that VSCode helps with.

## 8. OK, Now what.

Now that you've got a working version of Tachi running on your local PC, you should go check out the [component-specific contribution guides](./components.md)!

[^1]: Docker is not actually a VM, it's significantly smarter and does some Linux jail cgroup nonsense. All you need to care about is that it works like having a separate Linux system on your host system.
