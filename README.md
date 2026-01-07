# EvoCut Fancy HTML Demo (static)

This is a **static** (no backend required) demo UI for EvoCut-style runs.

It has **two pages**:

- `index.html` — setup/config page (pick a problem template, edit Pyomo code, choose improvement strategy & targets, set max generations/populations).
- `run.html` — animated “live replay” page that reads an existing JSON run and **simulates evolution in real time** (timeline, code diff, metrics, live chart, final summary).

## Quick start

1. Copy your completed run JSON files into `./data/`  
   Example filenames used by the demo:
   - `tsp.json`, `mcnd.json`, `jssp.json`, `cwlp.json`, `imo6.json`, `pdptw.json`

2. Put your Pyomo templates into `./templates/` (or edit the ones provided).
   - Each template can optionally include the marker:
     ```py
     # <EVOCUT_INSERT_CUT_HERE>
     ```
     Cuts will be inserted there during playback; otherwise they’re appended to the bottom.

3. Serve the folder with a local web server (fetch() won’t work reliably with file://):
   ```bash
   cd evocut-demo
   python -m http.server 5173
   ```
   Then open:
   - http://localhost:5173/index.html

## How the replay works

The replay page reads the JSON format produced by your `Population.save_to_json()`:

- `prev_populations`: `[[population_as_list_of_individual_dicts, best_fitness_at_that_time], ...]`
- `current_population`: list of individuals
- `best_fitness`: best overall fitness so far
- `best_indiv`: best individual dict
- `state`: integer generation counter (optional)

The UI builds a generation list:
`generations = prev_populations + [ [current_population, best_fitness] ]`

Then it computes:
- best fitness per generation (from JSON)
- mean fitness per generation (computed from individuals)
- std dev fitness per generation (computed from individuals)
- “best cut” per generation (best-fitness individual’s `chromosome.added_cut`)

Everything is displayed with animations and delays to look like a live run.

## Customize

- Problem list & metadata: `data/problems.json`
- UI behavior: `assets/js/setup-page.js`, `assets/js/run-page.js`
- Styling: `assets/css/app.css`

## Notes

- This is a **frontend-only** demo: it does not run Pyomo nor EvoCut.  
  It is designed for presentations and recorded demos. Later you can plug a backend into the same UI.
