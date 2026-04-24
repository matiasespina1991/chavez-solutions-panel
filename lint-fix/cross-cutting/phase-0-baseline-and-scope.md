# Fase 0 - Baseline y alcance

## LINT-0001 - Generar baseline reproducible XO

- `id`: LINT-0001
- `scope`: generar baseline de errores/warnings y top reglas en formato texto/json.
- `files`:
  - `lint-fix/reports/xo-baseline.txt`
  - `lint-fix/reports/xo-baseline.json`
  - `lint-fix/reports/xo-baseline-summary.txt`
  - `lint-fix/reports/xo-rule-counts.txt`
- `risk`: low
- `depends_on`: []
- `acceptance`:
  - [x] Baseline contiene conteo total de errores y warnings.
  - [x] Baseline contiene top de reglas para priorizacion.
- `validation_commands`:
  - `sed -n '1,40p' lint-fix/reports/xo-baseline-summary.txt`
  - `sed -n '1,40p' lint-fix/reports/xo-rule-counts.txt`
- `status`: `approved`

## LINT-0002 - Definir alcance exacto de lint por carpetas

- `id`: LINT-0002
- `scope`: fijar alcance de chequeo en source real y excluir artefactos/build/generated.
- `files`:
  - `.gitignore` (si aplica)
  - `.xo-config` o `package.json` del workspace objetivo (si aplica)
  - `lint-fix/README.md`
- `risk`: low
- `depends_on`:
  - LINT-0001
- `acceptance`:
  - [x] Queda definido un comando baseline unico y estable.
  - [x] Se excluyen rutas no fuente (`.next`, `lib` generado, etc.) del programa.
- `validation_commands`:
  - `./lint-fix/scripts/xo-ci.sh`
  - `./lint-fix/scripts/xo-baseline.sh`
- `status`: `approved`

## Resultado de fase

- Alcance final fijado a código fuente real:
  - `apps/admin-dashboard/src/**/*.{js,jsx,ts,tsx}`
  - `functions/src/**/*.{js,ts}`
- Excluidos artefactos y generados en config XO (`.next`, `node_modules`, `dist`, `coverage`, etc.).
- Comando único estable para local/CI: `./lint-fix/scripts/xo-ci.sh`.
