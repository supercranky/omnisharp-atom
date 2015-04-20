linterPath = atom.packages.getLoadedPackage("linter").path
Linter = require "#{linterPath}/lib/linter"
Rng = require("atom").Range;
OmniSharpServer = require '../omni-sharp-server/omni-sharp-server'
Omni = require '../omni-sharp-server/omni'
_ = require 'lodash'

class LinterCSharp extends Linter

    @syntax: ['source.cs']

    linterName: "C#"



    regex: ""

    constructor: (editor)->
        super(editor)


    getWordAt: (str, pos) =>
      if str == undefined
        return {
          start: pos
          end: pos
        }

      while pos < str.length && /\W/.test str[pos]
        ++pos

      left = str.slice(0, pos + 1).search /\W(?!.*\W)/
      right = str.slice(pos).search /(\W|$)/

      start: left + 1
      end: left + 1 + right

    lintFile: (filePath, callback) ->

        #if Omnisharp isn't booted, short out.
        return if OmniSharpServer?.vm?.isOff

        Omni.codecheck(null, @editor).then (data) =>

          errors = _.map data.QuickFixes, (error) =>
            line = error.Line-1
            column = error.Column-1
            text = @editor.lineTextForBufferRow line
            {start, end} = @getWordAt text, column
            level = error.LogLevel.toLowerCase()
            if level == "hidden"
              level = "info"

            return {
                message: error.Text,
                line: line + 1,
                col: column,
                level: level,
                range: new Rng([line, start], [line, end]),
                linter: @linterName
            }


          return callback(errors)



module.exports = LinterCSharp