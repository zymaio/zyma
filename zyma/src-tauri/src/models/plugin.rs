use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PluginViewDef {
    pub id: String,
    pub title: String,
    pub icon: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PluginContributions {
    pub views: Option<Vec<PluginViewDef>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub author: String,
    pub entry: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub contributes: Option<PluginContributions>,
}
