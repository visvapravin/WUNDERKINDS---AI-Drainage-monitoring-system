import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)
N = 3_000_000
start_time = datetime(2023, 1, 1, 0, 0)

# Generate timestamps
timestamps = pd.date_range(start=start_time, periods=N, freq='5min')

# Extract time features
hours = timestamps.hour
weekdays = timestamps.weekday

# Simulate rain and intensity
is_raining = np.random.choice([0, 1], size=N, p=[0.8, 0.2])
intensity = np.random.choice([0, 1, 2, 3], size=N, p=[0.5, 0.3, 0.15, 0.05])

# Baseline values
speed = np.random.normal(1.0, 0.3, N)
level = np.random.normal(10, 4, N)
gas = np.random.normal(300, 100, N)

# Morning/evening boost
morning_evening = ((6 <= hours) & (hours <= 9)) | ((17 <= hours) & (hours <= 20))
speed[morning_evening] += np.random.uniform(0.5, 1.0, morning_evening.sum())
level[morning_evening] += np.random.uniform(2.0, 4.0, morning_evening.sum())

# Weekend boost
weekend = weekdays >= 5
speed[weekend] += np.random.uniform(0.2, 0.8, weekend.sum())
level[weekend] += np.random.uniform(1.0, 2.0, weekend.sum())

# Rain effect
rain_idx = is_raining == 1
level[rain_idx] += np.random.uniform(5, 10, rain_idx.sum())
gas[rain_idx] += np.random.uniform(50, 100, rain_idx.sum())

# Clip values
speed = np.clip(speed, 0, None)
level = np.clip(level, 0, None)
gas = np.clip(gas, 0, None)

# Status assignment
status = np.where((level > 22) | (gas > 650), "Blocked",
         np.where((level >= 15) & (level <= 22) | (gas > 550), "Overflow", "Normal"))

# Build DataFrame
df = pd.DataFrame({
    "timestamp": timestamps,
    "speed": np.round(speed, 2),
    "waterLevel": np.round(level, 2),
    "gas": np.round(gas, 2),
    "isRaining": is_raining,
    "intensity": intensity,
    "status": status
})

df.to_csv("drainage_data.csv", index=False)
print("drainage_data.csv with 3 million rows generated.")