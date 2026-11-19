---
title: "Geological data analysis"
date: 2025-05-21
draft: false
categories: ["geospatial analysis", "python", "database"]
description: "Geochemical analysis and spatial interpolation with Python and QGIS, comparing nine power values for inverse distance weighting."
cover: Contour_plot.png
coverCaption: "IDW interpolation with power values from 1 to 9"
---

In this course, we used geochemical data to see how different statistical methods affect its interpretation.

![Manganese contour map](mapa_isolinhas_mn_germano.png "Distribution of manganese (Mn) concentration across the study area.")

In Geological Data Analysis I, I used **Python and QGIS** to process, analyze, and model geochemical data. The goal was to study the distribution of chemical elements and identify potential geochemical anomalies.

![Comparison of IDW power values](Contour_plot.png "IDW interpolation surfaces using power values from 1 to 9.")

I began with an exploratory analysis of **manganese (Mn) and zinc (Zn)**. I calculated descriptive statistics such as the mean, median, variance, standard deviation, coefficient of variation, skewness, and percentiles. I used histograms and box plots to examine distributions, spread, and extreme values.

![Manganese contour map](mapa_isolinhas_mn_germano.png)

For the spatial analysis, I georeferenced geochemical samples, including a set of **272 Zn samples**, in SIRGAS 2000 / UTM zone 24S. I used these data to produce geochemical distribution maps, contour maps, and maps based on concentration classes and percentiles.

I also tested **inverse distance weighting (IDW)** using nine power values, from 1 to 9. The comparison showed how power affected the smoothness of the interpolated surface, the prominence of local anomalies, and the shape of contours at levels corresponding to the 25th, 50th, and 75th percentiles.

I mapped **cerium (Ce) and cobalt (Co)** using percentile-based classes and outlier thresholds identified with box plots. I also fitted spatial trend surfaces, calculated residuals, and mapped both the residuals and their interpolated surfaces to distinguish regional patterns from local geochemical variation.

These activities gave me practical experience combining programming, statistics, and geographic information systems (GIS) for mineral exploration, geochemical anomaly analysis, and spatial interpretation of geological data.

**Tools used:** Python, Pandas, NumPy, GeoPandas, Matplotlib, Seaborn, Jupyter Notebook, and QGIS.

**Skills developed:** descriptive statistics, exploratory data analysis, scientific visualization, geoprocessing, IDW interpolation, parameter sensitivity analysis, trend surfaces, residual analysis, and geochemical mapping.
