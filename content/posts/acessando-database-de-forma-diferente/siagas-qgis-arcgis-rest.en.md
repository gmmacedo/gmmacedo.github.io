---
title: "When the website goes down: accessing SIAGAS well data directly in QGIS"
date: 2026-11-09
draft: false
categories: ["geospatial analysis", "python", "database"]
description: "How to retrieve public SIAGAS well data using QGIS, Python, and the Geological Survey of Brazil’s ArcGIS REST service."
---

## Introduction

I recently tried to open a Brazilian government website and found it was down. If this has never happened to you, it probably will.

It reminded me of news reports about AI agents that broke into servers after their usual approach failed. I wondered whether I could ask an agent to find another way to get the data I needed through an official channel.

The result taught me another way to add data in QGIS. I was familiar with the idea from working locally, since I have never used a remote server of my own.

I had previously practiced with PostgreSQL and its spatial extension on my own machine. Local connections had little noticeable latency, and setting up a database was more work than dragging shapefiles or GeoPackages into QGIS.

This time I needed data from SIAGAS, Brazil’s Groundwater Information System. The Geological Survey of Brazil (SGB) publishes an official geographic service for it. QGIS and Python can use that service even when the main website is down.

## 1. Connecting directly to the SIAGAS well database

SGB publishes well data through an ArcGIS REST service on its geoportal.

[SIAGAS: Wells layer (FeatureServer)](https://geoportal.sgb.gov.br/server/rest/services/Hosted/siagas_web/FeatureServer/1)

The service provides well geometries and attributes. Its layer uses geographic coordinates (EPSG:4326), returns GeoJSON, and supports pagination for retrieving large sets of records.

The service has three layers:

| ID | Layer |
| --- | --- |
| 0 | Poços Legacy (legacy wells) |
| 1 | Poços (wells) |
| 2 | Poços RIMAS (monitoring wells) |

### Connecting in QGIS

1. Open QGIS.
2. Choose `Layer → Add Layer → Add ArcGIS REST Server Layer` or open the Data Source Manager.
3. Create a connection with the URL below.
4. Connect and select the `Poços` layer.

```
https://geoportal.sgb.gov.br/server/rest/services/Hosted/siagas_web/FeatureServer
```

Once the layer loads, you can export it to a GeoPackage (`.gpkg`) and work with a local copy.

## 2. Downloading the data with Python

The REST service limits each response to 2,000 records. The script below retrieves the records in batches and saves them to a GeoPackage.

```python
import requests
import geopandas as gpd
from time import sleep

url = (
    "https://geoportal.sgb.gov.br/server/rest/services/"
    "Hosted/siagas_web/FeatureServer/1/query"
)

session = requests.Session()
features = []
offset = 0
batch_size = 2000

while True:
    params = {
        "where": "1=1",
        "outFields": "*",
        "returnGeometry": "true",
        "outSR": 4326,
        "resultOffset": offset,
        "resultRecordCount": batch_size,
        "orderByFields": "idt_ponto ASC",
        "f": "geojson",
    }

    response = session.get(url, params=params, timeout=120)
    response.raise_for_status()
    data = response.json()

    if "error" in data:
        raise RuntimeError(data["error"])

    batch = data["features"]
    if not batch:
        break

    features.extend(batch)
    print(f"Baixados: {len(features)} registros")

    if len(batch) < batch_size:
        break

    offset += len(batch)
    sleep(0.5)

gdf = gpd.GeoDataFrame.from_features(
    features,
    crs="EPSG:4326"
)

gdf.to_file(
    "siagas_brasil.gpkg",
    layer="pocos",
    driver="GPKG"
)

print(f"Total: {len(gdf)} poços")
```

The script uses the official layer. A complete download still depends on the server’s availability and stability.

To download wells for a single state, such as Rio Grande do Norte, change the filter:

```python
"where": "str_uf = 'RN'",
```

The layer contains fields including well depth, aquifer, static water level (`ne`), dynamic water level (`nd`), pH, electrical conductivity, and specific capacity.

## 3. An alternative service

SGB also provides a second official layer independent of the main SIAGAS Web endpoint.

[SIAGAS MODDAD: geographic service](https://geoportal.sgb.gov.br/server/rest/services/hidrologia/SIAGAS_MODDAD/FeatureServer/0)

You can use it if the main service is unavailable.

## What worked best for me

I tried Python first. The script remained slow even after I changed `batch_size` and `sleep`. It downloads wells in sequence, with up to 2,000 GeoJSON records per request. Raising `batch_size` could not change the server’s limit, and `sleep` added a pause between requests.

The AI agent suggested two other approaches. I tried the direct connection in QGIS and was surprised by how much faster it felt. QGIS requests the wells in the visible map area and fetches more as you move around. The script downloads the entire dataset in batches.

## Conclusion

A website outage taught me how to load remote geographic data directly in QGIS using an official REST service. The process requires neither a local database nor a working SIAGAS Web frontend.

The Python script worked in my test, but QGIS was much faster for exploring the wells. I recommend connecting to the SGB geoportal’s FeatureServer in QGIS and saving a local copy in GeoPackage or DuckDB for future analysis.

If a website goes down, it’s worth asking whether the data provider publishes another official way to access the same data.
