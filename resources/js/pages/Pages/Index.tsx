import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { DragStart } from '@hello-pangea/dnd';
import {
  BookOpenIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  Bars3Icon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { Head, router } from '@inertiajs/react';
import { ChevronRightIcon, HammerIcon } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/utils/commonUtils';

interface User {
  id: number;
  name: string;
  username: string;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  kind: 'page' | 'category';
  content?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  creator: User;
  order_index: number;
  parent_id?: string;
  children?: Page[];
}

interface Mod {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: 'public' | 'private' | 'unlisted';
  owner: User;
  github_repository_url?: string | null;
}

interface Props {
  mod: Mod;
  pages: Page[];
  canEdit: boolean;
}

export default function PagesIndex({ mod, pages, canEdit }: Props) {
  const [pagesList, setPagesList] = useState(pages);
  const [isDragDisabled, setIsDragDisabled] = useState(false);
  const [isDragModeEnabled, setIsDragModeEnabled] = useState(false);
  const [activeDragParentId, setActiveDragParentId] = useState<
    string | null | undefined
  >(undefined);
  const isGithubManaged = Boolean(mod.github_repository_url);

  const getParentIdFromDroppableId = (droppableId: string): string | null => {
    if (droppableId === 'pages-root') {
      return null;
    }

    if (droppableId.startsWith('pages-')) {
      return droppableId.slice('pages-'.length);
    }

    return null;
  };

  const handleDragEnd = async (result: DropResult) => {
    setActiveDragParentId(undefined);

    if (
      !result.destination ||
      !canEdit ||
      !isDragModeEnabled ||
      isGithubManaged
    ) {
      return;
    }

    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
      return;
    }

    if (source.index === destination.index) {
      return;
    }

    const sourceParentId = getParentIdFromDroppableId(source.droppableId);

    const draggedPage = pagesList.find((p) => p.id === draggableId);
    if (!draggedPage) return;

    const sameLevelPages = pagesList
      .filter((p) => (p.parent_id ?? null) === sourceParentId)
      .sort((a, b) => a.order_index - b.order_index);

    if (!sameLevelPages.some((page) => page.id === draggedPage.id)) {
      return;
    }

    const reorderedPages = Array.from(sameLevelPages);
    const [removed] = reorderedPages.splice(source.index, 1);
    if (!removed) {
      return;
    }

    const safeDestinationIndex = Math.min(
      Math.max(destination.index, 0),
      reorderedPages.length,
    );

    reorderedPages.splice(safeDestinationIndex, 0, removed);

    const pagesToUpdate = reorderedPages.map((page, index) => ({
      id: page.id,
      parent_id: page.parent_id || null,
      order_index: index,
    }));

    setIsDragDisabled(true);

    try {
      router.post(
        `/dashboard/mods/${mod.slug}/pages/reorder`,
        {
          pages: pagesToUpdate,
        },
        {
          preserveState: true,
          preserveScroll: true,
          onSuccess: () => {
            const newPagesList = pagesList.map((page) => {
              const updatedPage = pagesToUpdate.find((p) => p.id === page.id);
              return updatedPage
                ? { ...page, order_index: updatedPage.order_index }
                : page;
            });
            setPagesList(newPagesList);
          },
          onError: () => {
            setPagesList(pages);
          },
          onFinish: () => {
            setIsDragDisabled(false);
          },
        },
      );
    } catch (error) {
      console.error('Failed to update page order:', error);
      setPagesList(pages);
      setIsDragDisabled(false);
    }
  };

  const handleDragStart = (start: DragStart) => {
    if (!canEdit || !isDragModeEnabled || isGithubManaged) {
      return;
    }

    const draggedPage = pagesList.find((page) => page.id === start.draggableId);
    setActiveDragParentId(draggedPage?.parent_id ?? null);
  };

  const renderDraggablePage = (
    page: Page,
    index: number,
    level = 0,
    isLastAtLevel = false,
    ancestorLines: boolean[] = [],
  ) => (
    <Draggable
      key={page.id}
      draggableId={page.id}
      index={index}
      isDragDisabled={
        !canEdit || isDragDisabled || !isDragModeEnabled || isGithubManaged
      }
    >
      {(provided, snapshot) => (
        <tr
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group border-b transition-all hover:bg-muted/50 ${
            snapshot.isDragging ? 'bg-accent shadow-lg' : ''
          } ${isDragModeEnabled && canEdit ? 'hover:bg-accent' : ''}`}
        >
          <td className="w-1/2 py-2 pr-4">
            <div className="flex items-center">
              <div
                className="mr-2 flex items-center"
                style={{ minWidth: `${level * 16}px` }}
              >
                {level > 0 && (
                  <div className="flex items-center">
                    {ancestorLines.map((hasLine, i) => (
                      <div
                        key={i}
                        className={`h-6 w-4 ${hasLine ? 'border-l border-border' : ''}`}
                      />
                    ))}
                    <div className="relative h-6 w-4">
                      <div
                        className={`absolute top-0 left-0 h-3 w-3 border-b border-l border-border`}
                      />
                      {!isLastAtLevel && (
                        <div className="absolute top-3 bottom-0 left-0 w-0 border-l border-border" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {canEdit && isDragModeEnabled && (
                <div
                  {...provided.dragHandleProps}
                  className="mr-2 cursor-grab rounded p-1 opacity-60 group-hover:opacity-100 hover:bg-muted active:cursor-grabbing"
                  title="Drag to reorder"
                >
                  <Bars3Icon className="h-3 w-3 text-muted-foreground" />
                </div>
              )}

              <div
                className={`mr-2 h-2 w-2 shrink-0 rounded-full ${
                  page.kind === 'category' ? 'bg-blue-500' : 'bg-gray-400'
                }`}
              />

              <div className="flex min-w-0 flex-1 items-center">
                <a
                  href={`/dashboard/mods/${mod.slug}/pages/${page.slug}`}
                  className="truncate font-medium text-primary hover:underline"
                >
                  {page.title}
                </a>
                {!page.published && (
                  <Badge
                    variant="outline"
                    className="ml-2 border-yellow-400 text-xs text-yellow-400"
                  >
                    <HammerIcon className="mr-1 h-3 w-3" />
                    Draft
                  </Badge>
                )}
                {page.kind === 'category' && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Category
                  </Badge>
                )}
                {page.children && page.children.length > 0 && (
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    ({page.children.length})
                  </span>
                )}
              </div>
            </div>
          </td>

          <td className="px-2 py-2 text-center">
            <div
              className={`inline-flex h-2 w-2 items-center justify-center rounded-full ${
                page.published ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              title={page.published ? 'Published' : 'Draft'}
            />
          </td>

          <td className="truncate px-2 py-2 text-sm text-muted-foreground">
            {page.creator.name}
          </td>

          <td className="px-2 py-2 text-sm text-muted-foreground">
            {formatDate(page.updated_at)}
          </td>

          <td className="py-2 pl-2">
            <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button size="sm" variant="ghost" asChild className="h-6 w-6 p-0">
                <a
                  href={`/dashboard/mods/${mod.slug}/pages/${page.slug}`}
                  title="View page"
                >
                  <EyeIcon className="h-3 w-3" />
                </a>
              </Button>
              {canEdit && !isGithubManaged && (
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="h-6 w-6 p-0"
                >
                  <a
                    href={`/dashboard/mods/${mod.slug}/pages/${page.slug}/edit`}
                    title="Edit page"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </td>
        </tr>
      )}
    </Draggable>
  );

  const renderPageList = (
    pageList: Page[],
    parentId: string | null = null,
    level = 0,
    ancestorLines: boolean[] = [],
    renderInsideCell = false,
  ) => {
    const sortedPages = [...pageList].sort(
      (a, b) => a.order_index - b.order_index,
    );
    const droppableId = parentId ? `pages-${parentId}` : 'pages-root';
    const isDroppableDisabledByActiveDrag =
      activeDragParentId !== undefined && activeDragParentId !== parentId;

    const droppableBody = (
      <Droppable
        droppableId={droppableId}
        isDropDisabled={!isDragModeEnabled || isDroppableDisabledByActiveDrag}
      >
        {(provided, snapshot) => (
          <tbody
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`transition-colors ${
              snapshot.isDraggingOver ? 'bg-accent/50' : ''
            }`}
          >
            {sortedPages.map((page, index) => {
              const isLastAtLevel = index === sortedPages.length - 1;
              const newAncestorLines =
                level > 0 ? [...ancestorLines, !isLastAtLevel] : [];

              return (
                <React.Fragment key={page.id}>
                  {renderDraggablePage(
                    page,
                    index,
                    level,
                    isLastAtLevel,
                    ancestorLines,
                  )}

                  {page.children && page.children.length > 0 && (
                    <tr className="border-0">
                      <td colSpan={5} className="p-0">
                        {renderPageList(
                          page.children,
                          page.id,
                          level + 1,
                          newAncestorLines,
                          true,
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {provided.placeholder && (
              <tr>
                <td colSpan={5}>{provided.placeholder}</td>
              </tr>
            )}
          </tbody>
        )}
      </Droppable>
    );

    if (!renderInsideCell) {
      return droppableBody;
    }

    return (
      <div className="pl-0">
        <table className="min-w-full">{droppableBody}</table>
      </div>
    );
  };

  const buildPageTree = (allPages: Page[]) => {
    const childrenByParent = new Map<string | null, Page[]>();

    allPages.forEach((page) => {
      const parentKey = page.parent_id ?? null;
      const siblings = childrenByParent.get(parentKey) ?? [];
      siblings.push(page);
      childrenByParent.set(parentKey, siblings);
    });

    childrenByParent.forEach((siblings) => {
      siblings.sort((a, b) => a.order_index - b.order_index);
    });

    const attachChildren = (
      parentId: string | null,
      visited: Set<string> = new Set(),
    ): Page[] => {
      return (childrenByParent.get(parentId) ?? []).map((page) => {
        if (visited.has(page.id)) {
          return { ...page, children: [] };
        }

        const nextVisited = new Set(visited);
        nextVisited.add(page.id);

        return {
          ...page,
          children: attachChildren(page.id, nextVisited),
        };
      });
    };

    return attachChildren(null);
  };

  const pagesWithChildren = buildPageTree(pagesList);
  const rootPages = pagesWithChildren;
  const childPages = pagesList.filter((page) => page.parent_id);

  return (
    <AppLayout>
      <Head title={`All Pages - ${mod.name}`} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <nav className="mb-4 text-sm text-primary">
            <a href={`/dashboard/mods/${mod.slug}`} className="hover:underline">
              {mod.name}
            </a>
            <ChevronRightIcon className="m-1 inline h-4 w-4" />
            <span>All Pages</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">All Pages</h1>
              <p className="mt-2 text-muted-foreground">
                Browse all documentation pages in this mod
                {isDragModeEnabled && ' - Drag and drop enabled'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {canEdit && !isGithubManaged && (
                <Button
                  variant={isDragModeEnabled ? 'default' : 'outline'}
                  onClick={() => setIsDragModeEnabled(!isDragModeEnabled)}
                  disabled={isDragDisabled}
                >
                  <ArrowsUpDownIcon className="mr-2 h-4 w-4" />
                  {isDragModeEnabled ? 'Exit Reorder Mode' : 'Reorder Pages'}
                </Button>
              )}
              {canEdit && !isGithubManaged && (
                <Button asChild>
                  <a href={`/dashboard/mods/${mod.slug}/pages/create`}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    New Page
                  </a>
                </Button>
              )}
              {canEdit && !isGithubManaged && (
                <Button variant="outline" asChild>
                  <a
                    href={`/dashboard/mods/${mod.slug}/pages/create?kind=category`}
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    New Category
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {isDragModeEnabled && canEdit && !isGithubManaged && (
          <div className="mb-6 rounded-lg border border-accent bg-accent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ArrowsUpDownIcon className="mr-2 h-5 w-5 text-accent-foreground" />
                <div>
                  <p className="text-sm font-medium text-accent-foreground">
                    Reorder Mode Active
                  </p>
                  <p className="text-xs text-accent-foreground">
                    Drag the handle icons to reorder pages
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDragModeEnabled(false)}
                className="border-accent text-accent-foreground hover:bg-accent/10"
              >
                Exit
              </Button>
            </div>
          </div>
        )}

        {pagesList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpenIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium text-primary">
                No pages yet
              </h3>
              <p className="mb-4 text-muted-foreground">
                Start documenting your mod by creating your first page
              </p>
              {canEdit && !isGithubManaged && (
                <Button asChild>
                  <a href={`/dashboard/mods/${mod.slug}/pages/create`}>
                    Create First Page
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {isGithubManaged && (
              <p className="text-sm text-muted-foreground">
                This mod is GitHub-managed. Manual page creation and editing are
                disabled.
              </p>
            )}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-primary">
                {pagesList.length} Pages
              </h2>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>{rootPages.length} root pages</span>
                <span>{childPages.length} subpages</span>
              </div>
            </div>

            <DragDropContext
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="min-w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                        Page
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-medium tracking-wider text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                        Author
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                        Updated
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  {renderPageList(pagesWithChildren, null)}
                </table>
              </div>
            </DragDropContext>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
