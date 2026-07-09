import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error
import pickle
import os

# Generate synthetic training data
np.random.seed(42)
n = 1000

crime_types = ["theft", "assault", "fraud", "murder", "cybercrime", "kidnapping", "other"]
severities = ["low", "medium", "high", "critical"]

data = {
    "crime_type": np.random.choice(crime_types, n),
    "severity": np.random.choice(severities, n),
    "witness_count": np.random.randint(0, 10, n),
    "evidence_count": np.random.randint(0, 20, n),
    "officer_workload": np.random.randint(1, 10, n),
    "previous_similar_cases": np.random.randint(0, 50, n),
}

# Target: investigation days (domain-based formula + noise)
severity_days = {"low": 15, "medium": 30, "high": 60, "critical": 90}
crime_days = {"theft": 20, "assault": 25, "fraud": 45, "murder": 90, "cybercrime": 40, "kidnapping": 70, "other": 30}

days = []
for i in range(n):
    base = severity_days[data["severity"][i]] + crime_days[data["crime_type"][i]]
    base -= data["witness_count"][i] * 2
    base -= data["evidence_count"][i] * 1.5
    base += data["officer_workload"][i] * 3
    base += np.random.normal(0, 10)
    days.append(max(5, int(base)))

data["investigation_days"] = days
df = pd.DataFrame(data)

# Encode categoricals
le_crime = LabelEncoder()
le_severity = LabelEncoder()
df["crime_type_enc"] = le_crime.fit_transform(df["crime_type"])
df["severity_enc"] = le_severity.fit_transform(df["severity"])

features = ["crime_type_enc", "severity_enc", "witness_count", "evidence_count", "officer_workload", "previous_similar_cases"]
X = df[features]
y = df["investigation_days"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

preds = model.predict(X_test)
mae = mean_absolute_error(y_test, preds)
print(f"✅ Model trained — MAE: {mae:.2f} days")

# Save model and encoders
os.makedirs("models", exist_ok=True)
with open("models/model.pkl", "wb") as f:
    pickle.dump({"model": model, "le_crime": le_crime, "le_severity": le_severity}, f)

print("✅ Model saved to models/model.pkl")
