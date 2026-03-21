<?php

namespace App\Http\Controllers\Api\Client;

use App\Models\Mod;
use App\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ModController extends ClientController
{
    /**
     * Display a listing of user's mods.
     */
    public function index()
    {
        $mods = Mod::where('visibility', 'public')
            ->where('external_access', true)
            ->with('owner')
            ->latest()
            ->get();

        return response()->json(
            $mods->map(function (Mod $mod) {
                return [
                    'id' => $mod->id,
                    'name' => $mod->name,
                    'slug' => $mod->slug,
                    'description' => $mod->description,
                    'author' => [
                        'name' => $mod->owner->name,
                        'username' => $mod->owner->username,
                        'avatar_url' => $mod->owner->avatar_url,
                    ],
                    'index' => $mod->indexPage ? $this->pagePayload($mod->indexPage) : null,
                    'created_at' => $mod->created_at->toISOString(),
                    'updated_at' => $mod->updated_at->toISOString(),
                ];
            })
        );
    }

    /**
     * Display all the pages of a mod in hierarchical structure.
     */
    public function show(Request $request)
    {
        $modIdentifier = $request->route('mod');

        $mod = Mod::where('visibility', 'public')
            ->where('external_access', true)
            ->where(function ($query) use ($modIdentifier) {
                $query->where('id', $modIdentifier)
                    ->orWhere('slug', $modIdentifier);
            })
            ->with('owner')
            ->firstOrFail();

        if (! $mod->canBeAccessedBy(Auth::user())) {
            return response()->json(['error' => 'Access denied. You do not have permission to view this mod.'], 403);
        }

        $allPages = $mod->pages()->orderBy('order_index')->get();

        $pages = $this->buildPageHierarchy($allPages);

        return response()->json([
            'mod' => [
                'id' => $mod->id,
                'name' => $mod->name,
                'slug' => $mod->slug,
                'description' => $mod->description,
                'visibility' => $mod->visibility,
                'author' => [
                    'name' => $mod->owner->name,
                    'username' => $mod->owner->username,
                    'avatar_url' => $mod->owner->avatar_url,
                ],
                'created_at' => $mod->created_at->toISOString(),
                'updated_at' => $mod->updated_at->toISOString(),
            ],
            'pages' => $pages,
        ]);
    }

    /**
     * Recursively build page hierarchy from flat collection.
     */
    private function buildPageHierarchy($pages, $parentId = null)
    {
        return $pages
            ->filter(function ($page) use ($parentId) {
                return $page->parent_id === $parentId;
            })
            ->map(function ($page) use ($pages) {
                $children = $this->buildPageHierarchy($pages, $page->id);

                return [
                    ...$this->pagePayload($page),
                    'children' => $children->values()->toArray(),
                ];
            })
            ->values();
    }

    /**
     * Get the markdown contents of a specified page.
     */
    public function getPageContent(Request $request)
    {
        $mod_id = $request->route('mod');
        $page_slug = $request->route('page');

        $mod = Mod::where('id', $mod_id)
            ->where('visibility', 'public')
            ->where('external_access', true)
            ->with('owner')
            ->firstOrFail();

        if (! $mod->canBeAccessedBy(Auth::user())) {
            return response()->json(['error' => 'Access denied. You do not have permission to view this mod.'], 403);
        }

        $page = $mod->pages()->where('slug', $page_slug)->firstOrFail();

        return response()->json([
            'page' => $this->pagePayload($page),
            'content' => $page->content,
            'parent' => $page->parent ? $this->pagePayload($page->parent) : null,
            'children' => $page->children()->orderBy('order_index')->get()->map(function (Page $child) {
                return $this->pagePayload($child);
            })->values()->toArray(),
        ]);
    }

    private function pagePayload(Page $page): array
    {
        return [
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'kind' => $page->kind,
        ];
    }
}
