// swift-tools-version: 5.9
// Package.swift - Referencia para dependencias SPM
// Adicionar via Xcode: File > Add Package Dependencies

import PackageDescription

let package = Package(
    name: "ContaCasal",
    platforms: [
        .iOS(.v17)
    ],
    dependencies: [
        // Supabase Swift SDK
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.39.0"),
    ],
    targets: [
        .target(
            name: "ContaCasal",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
            ],
            path: "ContaCasal"
        ),
    ]
)
