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
    if let Some(stripped) = s.strip_prefix(r"\\?\") {
        stripped.to_string()
    } else {
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_to_string_forward_slashes() {
        let path = Path::new("some\\path\\to\\file.txt");
        let result = normalize_to_string(path);
        assert!(result.contains('/'));
        assert!(!result.contains('\\'));
    }

    #[test]
    #[cfg(windows)]
    fn test_normalize_windows_drive_uppercase() {
        let path = Path::new("c:\\Users\\test");
        let normalized = normalize(path);
        assert!(normalized.to_string_lossy().starts_with("C:"));
    }

    #[test]
    fn test_simplify_canonical_unc_prefix() {
        let path = PathBuf::from(r"\\?\C:\Users\test");
        let result = simplify_canonical(path);
        assert_eq!(result, r"C:\Users\test");
    }

    #[test]
    fn test_simplify_canonical_no_prefix() {
        let path = PathBuf::from(r"C:\Users\test");
        let result = simplify_canonical(path);
        assert_eq!(result, r"C:\Users\test");
    }
}
