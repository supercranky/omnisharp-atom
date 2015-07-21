import * as _ from "lodash";
import {Observable} from "rx";
import Omni = require('../../../omni-sharp-server/omni');
import Manager = require("../../../omni-sharp-server/client-manager");
var fetch: (url: string) => Rx.IPromise<IResult> = require('node-fetch');
interface IResult {
    json<T>(): T;
    text(): string;
}

function fetchFromGithub(source: string, prefix: string) {
    source = _.trim(source, '/').replace('www.', '').replace('https://', '').replace('http://', '').replace(/\/|\:/g, '-');
    var $get = fetch(`https://raw.githubusercontent.com/OmniSharp/omnisharp-nuget/master/resources/${source}/${prefix}.json`);

    return Observable
        .fromPromise<string[]>(
            $get.then(res => res.json<string[]>()))
        .catch(null);
}

interface IAutocompleteProviderOptions {
    editor: Atom.TextEditor;
    bufferPosition: TextBuffer.Point; // the position of the cursor
    prefix: string;
    scopeDescriptor: { scopes: string[] };
    activatedManually: boolean;
    path: string;
}

interface IAutocompleteProvider {
    fileMatchs: string[];
    pathMatch: (path: string) => boolean;
    getSuggestions: (options: IAutocompleteProviderOptions) => Rx.IPromise<any[]>;
    dispose(): void;
}

function makeSuggestion(item: string) {
    var type = 'package';

    return {
        _search: item,
        text: item,
        snippet: item,
        type: type,
        displayText: item,
        className: 'autocomplete-project-json',
    }
}

function makeSuggestion2(item: string) {
    var type = 'version';

    return {
        _search: item,
        text: item,
        snippet: item,
        type: type,
        displayText: item,
        className: 'autocomplete-project-json',
    }
}

var nameRegex = /\/?dependencies$/;
var versionRegex = /\/?dependencies\/([a-zA-Z0-9\._]*?)(?:\/version)?$/;

var nugetName: IAutocompleteProvider = {
    getSuggestions(options: IAutocompleteProviderOptions) {
        if (options.prefix.indexOf('.') > -1) {
            var packagePrefix = options.prefix.split('.')[0].toLowerCase();
        }
        return Manager.getClientForEditor(options.editor)
        // Get all sources
            .flatMap(z => Observable.from(z.model.packageSources))
            .flatMap(source => {
                // Attempt to get the source from github
                return fetchFromGithub(source, packagePrefix || "_keys")
                    .flatMap(z => {
                        if (!z) {
                            // fall back to the server if source isn't found
                            console.info(`Falling back to server package search for ${source}.`);
                            return Omni.request(solution => solution.packagesearch({
                                Search: options.prefix,
                                IncludePrerelease: true,
                                ProjectPath: solution.path,
                                Sources: [source],
                            }))
                                .flatMap(z => Observable.from(z.Packages))
                                .map(item => item.Id);
                        } else {
                            var o = Observable.from(z);
                            if (packagePrefix) {
                                o = o.map(z => z + '.');
                            }
                            return o;
                        }
                    });
            })
            .distinct()
            .map(makeSuggestion)
            .toArray()
            .toPromise();
    },
    fileMatchs: ['project.json'],
    pathMatch(path) { return !!path.match(nameRegex); },
    dispose() { }
}

var nugetVersion: IAutocompleteProvider = {
    getSuggestions(options: IAutocompleteProviderOptions) {
        var match = options.path.match(versionRegex);
        if (!match) return Promise.resolve([]);
        var name = match[1];

        return Omni.request(solution => solution.packageversion({
            Id: name,
            IncludePrerelease: true,
            ProjectPath: solution.path
        }))
            .flatMap(z => Observable.from(z.Versions))
            .map(makeSuggestion2)
            .toArray()
            .toPromise();
    },
    fileMatchs: ['project.json'],
    pathMatch(path) { return !!path.match(versionRegex); },
    dispose() { }
}

var providers = [nugetName, nugetVersion];
export = providers;
