# Infrastructure
## Compilation process

### Raw source code from UI
<!-- possibly process the text to remove symbols? no, leave that to the UI, don't make it valid -->
### Symbolizer
List of symbols along with original text, each symbol must have a range over the original text
### Tokenizer
List of tokens along with original text, each token must have a range over the original text
### Parser
ProgramAST, list of programastnodes along with original text, each programastnode contains some tokens which point to a range over the original text

