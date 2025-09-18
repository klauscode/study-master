# StudyFall Reproduction Commands

**Generated**: 2025-09-18
**Purpose**: Commands to reproduce analysis and simulation results

## Quick Start

### Run Complete Analysis Suite
```bash
# 1. Run 7-day simulation
cd .analysis
node sim_7d_simple.js

# 2. View generated artifacts
ls -la *.md *.csv *.json

# 3. Examine key findings
cat 02_balance_findings.md | grep -A5 "Priority"
head -10 03_kpis_7d.csv
```

## Individual Analysis Steps

### 1. Repository Census
```bash
# Generate repository overview
find src/ -name "*.ts" -o -name "*.tsx" | wc -l
find src/constants/ -name "*.json" | head -5
head -20 package.json
```

### 2. Core Loop Analysis
```bash
# Examine main game loop
grep -n "setInterval" src/context/GameStateContext.tsx
grep -A10 "TICK" src/context/GameStateContext.tsx
grep -A5 "ADD_XP" src/context/GameStateContext.tsx
```

### 3. Balance Analysis
```bash
# Key balance constants
grep -n "BASE_XP_PER_MINUTE" src/services/experienceService.ts
grep -n "LEVEL_EXPONENT" src/services/experienceService.ts
cat src/constants/rarities.json
cat src/constants/consumables.json | jq '.[] | {name, cost, tier}'
```

### 4. KPI Generation
```bash
# Run simulation with custom parameters
cd .analysis

# 7-day simulation (default)
node sim_7d_simple.js

# View results
head -5 03_kpis_7d.csv
tail -5 03_kpis_7d.csv
cat sim_7d_out.json | jq '.final_state'
```

## Simulation Commands

### Standard 7-Day Run
```bash
cd .analysis
node sim_7d_simple.js
echo "Results in 03_kpis_7d.csv and sim_7d_out.json"
```

### Analyze Progression Curves
```bash
# Extract level progression
cat 03_kpis_7d.csv | cut -d, -f4 | tail -n +2 | head -24

# Extract XP rates
cat 03_kpis_7d.csv | cut -d, -f7 | tail -n +2 | head -24

# Currency accumulation
cat 03_kpis_7d.csv | cut -d, -f8 | tail -n +2 | tail -24
```

### Focus and Stamina Analysis
```bash
# Focus multiplier tracking (from JSON)
cat sim_7d_out.json | jq '.final_state.focus'

# Stamina final state
cat sim_7d_out.json | jq '.final_state.stamina'

# Cycle completion rate
cat sim_7d_out.json | jq '.final_state.cycles_completed'
```

## Balance Testing Commands

### Test Consumable Stacking (Manual)
```bash
# Review consumable costs vs benefits
cat src/constants/consumables.json | jq '.[] | {name, cost, effects}'

# Calculate theoretical stacking multipliers
echo "Focus: Coffee(1.25) + Energy(1.4) + Ultimate(1.6) = $(echo '1.25 * 1.4 * 1.6' | bc -l)"
echo "XP: Study Boost(1.5) + Brain Pills(1.75) + Genius(2.0) = $(echo '1.5 * 1.75 * 2.0' | bc -l)"
```

### Currency Flow Analysis
```bash
# Daily currency income (from simulation)
cat sim_7d_out.json | jq '.balance_observations.total_cycles / 7' # cycles per day
echo "Daily Map Fragments: $(echo 'scale=0; 168 * 4 / 7' | bc -l)" # guaranteed minimums

# Compare with shop costs
cat src/constants/consumables.json | jq '.[] | .cost' | sort -n
```

### Progression Rate Testing
```bash
# Level curve analysis
for level in 1 10 20 50 100; do
  xp_req=$(echo "100 * ($level ^ 1.55)" | bc -l)
  echo "Level $level requires $(printf '%.0f' $xp_req) XP"
done

# Time to level calculations
cat sim_7d_out.json | jq '.balance_observations.avg_xp_per_hour'
```

## Advanced Analysis Commands

### State Invariant Checks
```bash
# Verify no negative values in KPIs
cat 03_kpis_7d.csv | tail -n +2 | cut -d, -f6,8 | grep -v "^[0-9]"
echo "Check: No negative XP or currency found"

# Verify monotonic progression
cat 03_kpis_7d.csv | tail -n +2 | cut -d, -f4 | sort -n | tail -5
echo "Check: Level progression is monotonic"
```

### Economic Balance Checks
```bash
# Income vs spending analysis
total_income=$(cat sim_7d_out.json | jq '.final_state.total_currency')
initial_currency=231  # From simulation start
net_income=$(echo "$total_income - $initial_currency" | bc)
echo "Net currency gained over 7 days: $net_income"

# Compare with potential spending
premium_cost=300
cycles_per_day=24
echo "Could buy $(echo "$net_income / $premium_cost" | bc) premium consumables"
```

### Performance Validation
```bash
# Simulation speed
time (cd .analysis && node sim_7d_simple.js > /dev/null)

# Memory usage estimate
ls -lh 03_kpis_7d.csv sim_7d_out.json
```

## Debugging Commands

### Check for State Corruption
```bash
# Verify KPI data integrity
wc -l 03_kpis_7d.csv
head -1 03_kpis_7d.csv | tr ',' '\n' | nl
cat 03_kpis_7d.csv | tail -n +2 | wc -l # Should be 168 for 7 days
```

### Validate Determinism
```bash
# Run simulation twice, compare outputs
cd .analysis
node sim_7d_simple.js > run1.log 2>&1
mv 03_kpis_7d.csv kpis_run1.csv

node sim_7d_simple.js > run2.log 2>&1
mv 03_kpis_7d.csv kpis_run2.csv

diff kpis_run1.csv kpis_run2.csv && echo "Deterministic: PASS" || echo "Deterministic: FAIL"
```

### Balance Issue Investigation
```bash
# Check for exponential growth patterns
cat 03_kpis_7d.csv | cut -d, -f8 | tail -n +2 | head -48 | tail -24 # Hours 25-48
cat 03_kpis_7d.csv | cut -d, -f8 | tail -24 # Final 24 hours

# Focus buildup validation
cat sim_7d_out.json | jq '.final_state.focus' # Should be 1.5 (max)
```

## Custom Test Scenarios

### Test Balance Fix Impact (Manual Code Changes)
```bash
# After implementing balance fixes, re-run simulation
# Example: reduced focus decay rate
sed -i 's/FOCUS_DECAY_RATE = 0.05/FOCUS_DECAY_RATE = 0.01/' .analysis/sim_7d_simple.js
node sim_7d_simple.js
mv 03_kpis_7d.csv 03_kpis_7d_fixed.csv

# Compare progression rates
echo "Original vs Fixed Focus Decay:"
diff <(cat 03_kpis_7d.csv | cut -d, -f10) <(cat 03_kpis_7d_fixed.csv | cut -d, -f10)
```

### Economy Stress Test
```bash
# Simulate higher currency generation
sed -i 's/Map Fragment.*+= 4/Map Fragment += 8/' .analysis/sim_7d_simple.js
node sim_7d_simple.js
cat sim_7d_out.json | jq '.final_state.total_currency'
echo "Double currency generation impact measured"
```

## Output Analysis Commands

### Generate Summary Report
```bash
cd .analysis
echo "# StudyFall Simulation Summary"
echo "Generated: $(date)"
echo
echo "## Final State"
cat sim_7d_out.json | jq '.final_state'
echo
echo "## Balance Observations"
cat sim_7d_out.json | jq '.balance_observations'
echo
echo "## Key Findings"
grep -A3 "Priority" 02_balance_findings.md
```

### Export for External Analysis
```bash
# Convert CSV to different formats for analysis tools
# For spreadsheet import
cat 03_kpis_7d.csv | sed 's/,/\t/g' > 03_kpis_7d.tsv

# For Python/R analysis
echo "import pandas as pd; df = pd.read_csv('03_kpis_7d.csv'); print(df.describe())" > analyze.py
python3 analyze.py
```

## Next Steps

1. **Validate Findings**: Run commands above to verify analysis results
2. **Test Balance Fixes**: Implement suggested fixes and re-run simulation
3. **Extended Analysis**: Modify simulation parameters to test edge cases
4. **Performance Testing**: Measure simulation accuracy against real game behavior

## Notes

- All commands assume execution from project root unless specified
- Simulation results are deterministic with seed "auditor-7d"
- Generated files are in `.analysis/` directory
- Check file timestamps to ensure fresh results