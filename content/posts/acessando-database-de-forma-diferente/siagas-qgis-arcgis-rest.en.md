---
title: "When the Website Goes Down: How I Accessed SIAGAS Wells Directly from QGIS"
date: 2026-11-09
draft: false
categories: ["geoprocessamento", "python", "database"]
---

## Introduction

I recently went through a situation that, if you haven't experienced it yet, you most likely will: opening the website of a Brazilian government agency and finding it offline.

That's when I remembered news stories about AI agents that, unable to complete a task the conventional way, ended up breaking into a server to get the result. I thought: what if I asked an agent to find an alternative way to access the data I wanted? (Without breaking into anything, of course.)

The result did not disappoint. Even better: it taught me a new method for adding data to QGIS. I already knew the idea, but only applied locally, since I still don't have any remote server.

When I practiced with databases, more specifically PostgreSQL with the spatial extension, I did everything on my own machine. So I never felt the latency of a non-local server, and there was no significant difference between one approach and the other. On top of that, setting up the database was much more work than using my folders of shapefiles and GeoPackages, which already had shortcuts in QGIS: I just had to drag and drop the files.

This time was different, and the path I found is worth sharing. The data in question came from SIAGAS (the Brazilian Groundwater Information System), and the solution was an official geographic service from the Geological Survey of Brazil (SGB), which can be accessed directly from QGIS or Python, without depending on the website that was down.

## 1. Direct access to the SIAGAS well database

The SGB makes the wells available through an ArcGIS REST service on its Geoportal:

[SIAGAS: Wells Layer (FeatureServer)](https://geoportal.sgb.gov.br/server/rest/services/Hosted/siagas_web/FeatureServer/1)

This service provides the geometry of the wells and their attributes. The layer uses geographic coordinates (EPSG:4326), accepts queries in GeoJSON, and supports pagination, which makes it possible to retrieve large volumes of records.

The service has three layers:

| ID | Layer |
| --- | --- |
| 0 | Legacy Wells |
| 1 | Wells |
| 2 | RIMAS Wells |

### How to access it from QGIS

1. Open QGIS.
2. Go to `Layer → Add Layer → Add ArcGIS REST Server Layer` (or use the Data Source Manager).
3. Create a new connection with the URL below.
4. Connect and select the `Wells` layer.

```
https://geoportal.sgb.gov.br/server/rest/services/Hosted/siagas_web/FeatureServer
```

Once loaded, you can export the layer to GeoPackage (`.gpkg`) and start working with a local copy.

## 2. Downloading the data with Python

The REST service limits each response to 2,000 records. The solution is to use pagination: the script below goes through the layer in blocks and, at the end, saves everything to a GeoPackage.

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

Keep in mind that the code uses the official layer, but running it to completion still depends on the server's availability and stability.

To download only the wells of a single state, such as Rio Grande do Norte, just change the filter:

```python
"where": "str_uf = 'RN'",
```

The layer includes fields such as depth, aquifer, static level (`ne`), dynamic level (`nd`), pH, electrical conductivity, and specific capacity, which already opens up plenty of analysis possibilities.

## 3. A second service as a fallback

There is also a second official layer, independent of the main SIAGAS Web address:

[SIAGAS MODDAD: Geographic service](https://geoportal.sgb.gov.br/server/rest/services/hidrologia/SIAGAS_MODDAD/FeatureServer/0)

It can serve as an alternative if the first one has problems.

## My take

I initially tested the Python code, which was my goal in the first place, but it has some drawbacks, mainly speed: even after changing the `batch_size` and `sleep` parameters, it remained very slow and less practical. The reason is that the script downloads the wells in series: each request returns at most 2,000 records in GeoJSON, and only then is the next one made. Since that limit is set by the server itself, increasing `batch_size` didn't help, and `sleep` still added a pause to every request.

I also saw that there were two other approaches that the AI suggested, and I decided to test them. I was curious about the first one, which integrates directly with QGIS, and I was impressed by its speed compared to the previous method. QGIS doesn't need to download the whole service at once: it asks the server only for the wells in the area visible on the map and fetches more as you navigate, whereas the script goes through the entire database in blocks.

## Conclusion

What started as a setback, a website being offline, turned into quite a learning experience. I found out that you can bring remote geographic data straight into QGIS using an official REST service, without setting up a database and without depending on the agency's website.

In my test, the Python script worked, but it was much slower than the direct connection through QGIS. That's why my recommendation is to connect the Geoportal's SGB FeatureServer in QGIS and save a local copy as a GeoPackage or DuckDB. That way you won't be held hostage by SIAGAS Web every time you need to query or analyze the wells.

And here's a tip: the next time a website goes down, ask your AI agent whether there is another official path to the data. Sometimes there is, and you learn something new along the way.
