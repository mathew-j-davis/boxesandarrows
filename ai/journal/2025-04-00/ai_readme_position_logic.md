# Analysis of Position Calculation Precedence

This document summarizes the analysis of the positioning logic and precedence defined in `Position.calculatePositionAndScale` within `src/geometry/position.js`.

## Overview

The method calculates the final scaled and unscaled position of a node based on various input parameters. It follows a specific order of precedence to determine which parameters take priority.

## Order of Precedence

1.  **Explicit `x` AND `y` Coordinates:**
    *   Highest priority.
    *   If both `x` and `y` are provided (not `undefined` or `null`), they are used directly.
    *   Scaling (`x_by`, `y_by`) and offsets (`x_offset`, `y_offset`) are applied.
    *   `positionType` is set to `COORDINATES`.
    *   Returns immediately.

2.  **Explicit `at` Named Position:**
    *   Second priority (if `x,y` are not both provided).
    *   If `at` is a non-empty string, it's used as a direct named position reference.
    *   No coordinate calculation occurs in this specific case.
    *   `positionType` is set to `NAMED`.
    *   Returns immediately.

3.  **`position_of` (Combined Reference):**
    *   Third priority.
    *   Uses `Position.calculatePositionFromReference` based on a reference node and optional anchor (e.g., `"nodeA"`, `"nodeA.north"`).
    *   Attempts to resolve the reference to coordinates.
    *   If successful (`COORDINATES`): Returns calculated coordinates.
    *   If fallback (`NAMED`): Returns named reference details (`atNode`, `atAnchor`, etc.).
    *   Returns the calculated `Position` object.

4.  **`x_of` / `y_of` (Independent Axis References):**
    *   Fourth priority.
    *   Calculates each axis independently using `Position.calculatePositionFromReference`.
    *   `x_of` uses `x_offset`; `y_of` uses `y_offset`.
    *   If an axis calculation succeeds (`COORDINATES`), its value is used.
    *   If an axis calculation fails or is not provided, the initial default value (e.g., `0`, scaled) is used for that axis.
    *   `positionType` is set to `COORDINATES` if either axis is successfully calculated.
    *   Returns the combined `Position` object.

## Fallback / Failure

*   If none of the positioning methods succeed (e.g., reference node not found), the `Position` object is returned with `success: false` and potentially an error message.
*   Coordinates might remain `null` or default to `0`.

## Summary

The logic prioritizes direct coordinate/named specifications before attempting relative positioning. It clearly distinguishes between resolving positions to coordinates versus falling back to named anchor references when full coordinate calculation isn't possible.
