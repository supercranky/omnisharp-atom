/// <reference path="../tsd.d.ts" />
import {expect} from "chai";
import {CompositeDisposable} from "../../lib/Disposable";
import {setupFeature} from "../test-helpers";

describe("Navigation", () => {
    setupFeature(["features/navigate-up-down"]);

    it("adds commands", (done) => {
        const disposable = new CompositeDisposable();
        const commands: any = atom.commands;

        expect(commands.registeredCommands["omnisharp-atom:navigate-up"]).to.be.true;
        expect(commands.registeredCommands["omnisharp-atom:navigate-down"]).to.be.true;
        disposable.dispose();
    });

    // TODO: Test functionality
});
