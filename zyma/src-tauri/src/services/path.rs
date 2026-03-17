use std::path::{Path, PathBuf, Component};

/// Normalizes a path to use forward slashes and consistent casing for drive letters (Windows).
/// Returns a String.
pub fn normalize_to_string<P: AsRef<Path>>(path: P) -> String {
    normalize(path.as_ref()).to_string_lossy().to_string().replace("\\", "/")
}

/// Normalizes a path to a PathBuf with consistent component handling.
/// Specifically handles Windows drive letter casing.
pub fn normalize(path: &Path) -> PathBuf {
    let mut components = path.components().peekable();
    let mut ret = if let Some(c @ Component::Prefix(..)) = components.peek().cloned() {
        components.next();
        // Force uppercase drive letters on Windows for consistency
        let prefix_os = c.as_os_str().to_string_lossy();
        if prefix_os.contains(':') {
            PathBuf::from(prefix_os.to_uppercase())
        } else {
            PathBuf::from(c.as_os_str())
        }
    } else {
        PathBuf::new()
    };

    for component in components {
        match component {
            Component::Prefix(..) => unreachable!(),
            Component::RootDir => { ret.push(component.as_os_str()); } 
            Component::CurDir => {} 
            Component::ParentDir => { ret.pop(); } 
            Component::Normal(c) => { ret.push(c); }
        }
    }
    ret
}

/// Checks if a child path is within a parent path.
pub fn is_within(parent: &Path, child: &Path) -> bool {
    child.starts_with(parent)
}

/// Simplifies a canonical path by removing the Windows UNC prefix if present.
pub fn simplify_canonical(path: PathBuf) -> String {
    let s = path.to_string_lossy().to_string();
    if s.starts_with(r"\\?\") {
        s[4..].to_string()
    } else {
        s
    }
}
