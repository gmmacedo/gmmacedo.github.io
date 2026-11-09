---
title: "Quando o site cai: como acessei os poços do SIAGAS direto pelo QGIS"
date: 2026-11-09
draft: false
categories: ["geoprocessamento", "python", "database"]
---

## Introdução

Recentemente passei por uma situação que, se você ainda não viveu, muito provavelmente vai viver: abrir o site de um órgão brasileiro e dar de cara com ele fora do ar.

Foi aí que me lembrei de notícias que circularam em jornais sobre agentes de IA que, ao não conseguirem cumprir uma tarefa da forma convencional, acabaram invadindo um servidor para chegar ao resultado. Pensei: e se eu pedisse para um agente encontrar um método alternativo de acessar o dado que eu queria? (Sem invadir nada, claro.)

O resultado não decepcionou. Melhor ainda: ele me ensinou um método novo de adicionar dados no QGIS. Eu já conhecia a ideia, mas só aplicada de forma local, afinal ainda não tenho nenhum servidor remoto.

Quando pratiquei com banco de dados, mais especificamente PostgreSQL com a extensão de dados espaciais, fiz tudo na minha própria máquina. Por isso nunca senti a latência de um servidor que não fosse local, e não havia diferença significativa entre uma abordagem e outra. Além disso, configurar o banco de dados dava muito mais trabalho do que usar minhas pastas de shapes e GeoPackages, que já tinham atalho no QGIS: bastava arrastar os arquivos.

Dessa vez foi diferente, e o caminho que encontrei vale ser compartilhado. O dado em questão era o do SIAGAS (Sistema de Informações de Águas Subterrâneas), e a solução foi um serviço geográfico oficial do Serviço Geológico do Brasil (SGB), que pode ser acessado diretamente pelo QGIS ou por Python, sem depender do site que estava fora do ar.

## 1. Acesso direto ao banco de poços do SIAGAS

O SGB disponibiliza os poços por meio de um serviço ArcGIS REST no Geoportal:

[SIAGAS: Camada de Poços (FeatureServer)](https://geoportal.sgb.gov.br/server/rest/services/Hosted/siagas_web/FeatureServer/1)

Esse serviço entrega a geometria dos poços e seus atributos. A camada usa coordenadas geográficas (EPSG:4326), aceita consultas em GeoJSON e permite paginação, o que viabiliza recuperar grandes volumes de registros.

O serviço tem três camadas:

| ID | Camada |
| --- | --- |
| 0 | Poços Legacy |
| 1 | Poços |
| 2 | Poços RIMAS |

### Como acessar pelo QGIS

1. Abra o QGIS.
2. Vá em `Camada → Adicionar Camada → Adicionar Camada ArcGIS REST Server` (ou use o Gerenciador de Fontes de Dados).
3. Crie uma nova conexão com a URL abaixo.
4. Conecte e selecione a camada `Poços`.

```
https://geoportal.sgb.gov.br/server/rest/services/Hosted/siagas_web/FeatureServer
```

Depois de carregada, você pode exportar a camada para GeoPackage (`.gpkg`) e passar a trabalhar com uma cópia local.

## 2. Baixando os dados com Python

O serviço REST limita cada resposta a 2.000 registros. A solução é usar paginação: o script abaixo percorre a camada em blocos e, no final, salva tudo em um GeoPackage.

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

Vale lembrar que o código usa a camada oficial, mas a execução completa ainda depende da disponibilidade e da estabilidade do servidor.

Para baixar somente os poços de um estado, como o Rio Grande do Norte, basta alterar o filtro:

```python
"where": "str_uf = 'RN'",
```

A camada traz campos como profundidade, aquífero, nível estático (`ne`), nível dinâmico (`nd`), pH, condutividade elétrica e capacidade específica, o que já abre muita possibilidade de análise.

## 3. Um segundo serviço como alternativa

Também existe uma segunda camada oficial, independente do endereço principal do SIAGAS Web:

[SIAGAS MODDAD: Serviço geográfico](https://geoportal.sgb.gov.br/server/rest/services/hidrologia/SIAGAS_MODDAD/FeatureServer/0)

Ela pode servir de alternativa caso a primeira apresente problemas.

## Minha opinião

Testei inicialmente o código em Python, que era o meu objetivo em primeiro lugar, mas ele tem algumas desvantagens, principalmente a velocidade, mesmo alterando os parâmetros de `batch_size` e o `sleep`, continuava muito lento e menos prático. O motivo é que o script baixa os poços em série: cada requisição devolve no máximo 2.000 registros em GeoJSON e só depois a próxima é feita. Como esse limite é do próprio servidor, aumentar o `batch_size` não ajudava, e o `sleep` ainda somava uma pausa a cada requisição.

Vi também que existiam outras duas formas que a IA me retornou e eu decidi testar. Fiquei curioso com a primeira que tinha integração direta com o QGIS, e fiquei impressionado com a velocidade comparada com o método anterior. O QGIS não precisa baixar o serviço inteiro de uma vez: ele pede ao servidor apenas os poços da área visível no mapa e busca mais conforme você navega, enquanto o script percorre a base completa em blocos.

## Conclusão

O que começou como um contratempo, um site fora do ar, acabou virando um aprendizado e tanto. Descobri que dá para trazer dados geográficos remotos direto para o QGIS usando um serviço REST oficial, sem montar banco de dados e sem depender do site do órgão.

No meu teste, o script em Python funcionou, mas foi bem mais lento que a conexão direta pelo QGIS. Por isso, minha recomendação é conectar o FeatureServer do Geoportal do SGB no QGIS e salvar uma cópia local em GeoPackage ou DuckDB. Assim você não fica refém do SIAGAS Web toda vez que precisar consultar ou analisar os poços.

E fica uma dica: da próxima vez que um site sair do ar, pergunte ao seu agente de IA se existe outro caminho oficial até o dado. Às vezes existe, e você ainda aprende algo novo no processo.
