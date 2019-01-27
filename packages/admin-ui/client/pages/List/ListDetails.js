/** @jsx jsx */
import { jsx } from '@emotion/core';
import { Component, createRef, Fragment, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { withRouter } from 'react-router-dom';

import { PlusIcon, SearchIcon, XIcon } from '@arch-ui/icons';
import { Input } from '@arch-ui/input';
import { Container, FlexGroup } from '@arch-ui/layout';
import { A11yText, Kbd, Title } from '@arch-ui/typography';
import { Button, IconButton } from '@arch-ui/button';
import { LoadingSpinner } from '@arch-ui/loading';
import { colors } from '@arch-ui/theme';

import ListTable from '../../components/ListTable';
import CreateItemModal from '../../components/CreateItemModal';
import PageLoading from '../../components/PageLoading';
import { Popout, DisclosureArrow } from '../../components/Popout';
import ContainerQuery from '../../components/ContainerQuery';

import ColumnSelect from './ColumnSelect';
import AddFilterPopout from './Filters/AddFilterPopout';
import ActiveFilters from './Filters/ActiveFilters';
import SortSelect, { SortButton } from './SortSelect';
import Pagination from './Pagination';
import Management, { ManageToolbar } from './Management';
import type { SortByType } from './DataProvider';
import { MoreDropdown } from './MoreDropdown';

// ==============================
// Styled Components
// ==============================

const Note = styled.div({
  color: colors.N60,
  fontSize: '0.85em',
});

const Search = ({ children, hasValue, isFetching, onClear, onSubmit }) => {
  const Icon = hasValue ? XIcon : SearchIcon;
  const isLoading = hasValue && isFetching;

  // NOTE: `autoComplete="off"` doesn't behave as expected on `<input />` in
  // webkit, so we apply the attribute to a form tag here.
  return (
    <form css={{ position: 'relative' }} autoComplete="off" onSubmit={onSubmit}>
      {children}
      <div
        css={{
          alignItems: 'center',
          color: colors.N30,
          cursor: 'pointer',
          display: 'flex',
          height: 34,
          justifyContent: 'center',
          pointerEvents: hasValue ? 'all' : 'none',
          position: 'absolute',
          right: 0,
          top: 0,
          width: 40,

          ':hover': {
            color: hasValue ? colors.text : colors.N30,
          },
        }}
      >
        {isLoading ? <LoadingSpinner size={16} /> : <Icon onClick={hasValue ? onClear : null} />}
      </div>
    </form>
  );
};

type GenericFn = (*) => void;

type Props = {
  list: Object,
  query: {
    data: Object,
    error: Object,
    loading: boolean,
    refetch: GenericFn,
  },
  currentPage: number,
  fields: Array<Object>,
  handleFieldChange: GenericFn,
  handlePageChange: GenericFn,
  handleSearchChange: GenericFn,
  handleSearchClear: GenericFn,
  handleSearchSubmit: GenericFn,
  handleSortChange: GenericFn,
  items: Array<Object>,
  itemsCount: number,
  pageSize: number,
  search: string,
  skip: number,
  sortBy: SortByType,
};
type State = {
  isFullWidth: boolean,
  selectedItems: Array<Object>,
  showCreateModal: boolean,
};

function bodyUserSelect(val) {
  document.body.style.WebkitUserSelect = val;
  document.body.style.MozUserSelect = val;
  document.body.style.msUserSelect = val;
  document.body.style.userSelect = val;
}

function useShiftIsDown() {
  let [shiftIsDown, setShiftIsDown] = useState(false);
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Shift') {
        setShiftIsDown(true);
      }
    }
    function handleKeyUp(event) {
      if (event.key === 'Shift') {
        setShiftIsDown(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  return shiftIsDown;
}

function NoResultsMessage({ filters, itemsCount, list, search, currentPage, handlePageReset }) {
  if (filters && filters.length) {
    return (
      <span>
        No {list.plural.toLowerCase()} found matching the{' '}
        {filters.length > 1 ? 'filters' : 'filter'}
      </span>
    );
  }
  if (search && search.length) {
    return (
      <span>
        No {list.plural.toLowerCase()} found matching &ldquo;
        {search}
        &rdquo;
      </span>
    );
  }

  if (currentPage !== 1) {
    return (
      <div>
        <p>
          Not enough {list.plural.toLowerCase()} found to show page {currentPage}.
        </p>
        <Button variant="ghost" onClick={handlePageReset}>
          Show first page
        </Button>
      </div>
    );
  }

  if (itemsCount === 0) {
    return <span>No {list.plural.toLowerCase()} to display yet...</span>;
  }

  return null;
}

class ListDetails extends Component<Props, State> {
  state = {
    isFullWidth: false,
    selectedItems: [],
    showCreateModal: false,
    searchValue: this.props.search,
  };
  lastChecked = null;
  shiftIsDown = false;

  // ==============================
  // Refs
  // ==============================

  sortPopoutRef = createRef();

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }
  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown = event => {
    if (event.key === 'Shift') {
      if (this.state.selectedItems.length > 0) {
        bodyUserSelect('none');
      }
      this.shiftIsDown = true;
    }
  };
  handleKeyUp = event => {
    if (event.key === 'Shift') {
      if (this.state.selectedItems.length > 0) {
        bodyUserSelect(null);
      }
      this.shiftIsDown = false;
    }
  };

  render() {
    const {
      adminPath,
      currentPage,
      fields,
      filters,
      handleFieldChange,
      handleFilterAdd,
      handleFilterRemove,
      handleFilterRemoveAll,
      handleFilterUpdate,
      handlePageChange,
      handlePageReset,
      handleSortChange,
      items,
      itemsCount,
      itemsErrors,
      list,
      pageSize,
      query,
      sortBy,
      search,
      history,
    } = this.props;
    const { isFullWidth, selectedItems, showCreateModal, searchValue } = this.state;

    const searchId = 'ks-list-search-input';

    let closeCreateModal = () => this.setState({ showCreateModal: false });
    let openCreateModal = () => this.setState({ showCreateModal: true });

    // ==============================
    // Search
    // ==============================

    let handleSearchChange = ({ target: { value } }) => {
      this.setState({ searchValue: value }, () => {
        this.props.handleSearchChange(value);
      });
    };
    let handleSearchClear = () => {
      this.setState({ searchValue: '' });
      this.props.handleSearchClear();
      this.searchInput.focus();
    };
    let handleReset = () => {
      this.setState({ searchValue: '' });
      this.props.handleReset();
    };
    let handleSearchSubmit = event => {
      event.preventDefault();
      this.props.handleSearchSubmit();
    };

    // ==============================
    // Management
    // ==============================

    let handleItemSelect = (itemId: string) => {
      let selectedItems = this.state.selectedItems.slice(0);

      if (this.shiftIsDown && this.lastChecked) {
        const itemIds = this.props.items.map(i => i.id);
        const from = itemIds.indexOf(itemId);
        const to = itemIds.indexOf(this.lastChecked);
        const start = Math.min(from, to);
        const end = Math.max(from, to) + 1;

        itemIds
          .slice(start, end)
          .filter(id => id !== this.lastChecked)
          .forEach(id => {
            if (!selectedItems.includes(this.lastChecked)) {
              selectedItems = selectedItems.filter(existingId => existingId !== id);
            } else {
              selectedItems.push(id);
            }
          });

        // lazy ensure unique
        const uniqueItems = [...new Set(selectedItems)];
        this.setState({ selectedItems: uniqueItems });
      } else {
        if (selectedItems.includes(itemId)) {
          selectedItems = selectedItems.filter(existingId => existingId !== itemId);
        } else {
          selectedItems.push(itemId);
        }

        this.setState({ selectedItems });
      }

      this.lastChecked = itemId;
    };
    let handleItemSelectAll = (selectedItems: Array<string>) => {
      this.setState({ selectedItems });
    };
    let onDeleteSelectedItems = () => {
      if (query.refetch) query.refetch();
      this.setState({ selectedItems: [] });
    };
    let onCreate = ({ data }) => {
      let id = data[list.gqlNames.createMutationName].id;
      history.push(`${adminPath}/${list.path}/${id}`);
    };

    let toggleFullWidth = () => {
      this.setState(state => ({ isFullWidth: !state.isFullWidth }));
    };
    return (
      <Fragment>
        <main>
          <ContainerQuery>
            {({ width }) => (
              <Container isFullWidth={isFullWidth}>
                <Title as="h1" margin="both">
                  {itemsCount > 0 ? list.formatCount(itemsCount) : list.plural}
                  <span>, by</span>
                  <Popout
                    innerRef={this.sortPopoutRef}
                    headerTitle="Sort"
                    footerContent={
                      <Note>
                        Hold <Kbd>alt</Kbd> to toggle ascending/descending
                      </Note>
                    }
                    target={
                      <SortButton>
                        {sortBy.field.label.toLowerCase()}
                        <DisclosureArrow size="0.2em" />
                      </SortButton>
                    }
                  >
                    <SortSelect
                      popoutRef={this.sortPopoutRef}
                      fields={list.fields}
                      onChange={handleSortChange}
                      value={sortBy}
                    />
                  </Popout>
                </Title>

                <FlexGroup growIndexes={[0]}>
                  <Search
                    isFetching={query.loading}
                    onClear={handleSearchClear}
                    onSubmit={handleSearchSubmit}
                    hasValue={searchValue && searchValue.length}
                  >
                    <A11yText tag="label" htmlFor={searchId}>
                      Search {list.plural}
                    </A11yText>
                    <Input
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                      id={searchId}
                      onChange={handleSearchChange}
                      placeholder="Search"
                      name="item-search"
                      value={searchValue}
                      type="text"
                      ref={el => (this.searchInput = el)}
                    />
                  </Search>
                  <AddFilterPopout
                    existingFilters={filters}
                    fields={list.fields}
                    onChange={handleFilterAdd}
                  />
                  <Popout buttonLabel="Columns" headerTitle="Columns">
                    <ColumnSelect
                      fields={list.fields}
                      onChange={handleFieldChange}
                      removeIsAllowed={fields.length > 1}
                      value={fields}
                    />
                  </Popout>

                  {list.access.create ? (
                    <IconButton appearance="create" icon={PlusIcon} onClick={openCreateModal}>
                      Create
                    </IconButton>
                  ) : null}
                  <MoreDropdown
                    width={width}
                    isFullWidth={isFullWidth}
                    onReset={handleReset}
                    onFullWidthToggle={toggleFullWidth}
                  />
                </FlexGroup>

                <ActiveFilters
                  filterList={filters}
                  onUpdate={handleFilterUpdate}
                  onRemove={handleFilterRemove}
                  onClear={handleFilterRemoveAll}
                />

                <ManageToolbar isVisible={!!itemsCount}>
                  {selectedItems.length ? (
                    <Management
                      list={list}
                      onDeleteMany={onDeleteSelectedItems}
                      // onUpdateMany={onUpdate}
                      pageSize={pageSize}
                      selectedItems={selectedItems}
                      totalItems={itemsCount}
                    />
                  ) : (
                    <Pagination
                      isLoading={query.loading}
                      currentPage={currentPage}
                      itemsCount={itemsCount}
                      list={list}
                      onChangePage={handlePageChange}
                      pageSize={pageSize}
                    />
                  )}
                </ManageToolbar>
              </Container>
            )}
          </ContainerQuery>

          <CreateItemModal
            isOpen={showCreateModal}
            list={list}
            onClose={closeCreateModal}
            onCreate={onCreate}
          />

          <Container isFullWidth={isFullWidth}>
            {items ? (
              <ListTable
                adminPath={adminPath}
                fields={fields}
                isFullWidth={isFullWidth}
                items={items}
                itemsErrors={itemsErrors}
                list={list}
                onChange={query.refetch}
                onSelect={handleItemSelect}
                onSelectAll={handleItemSelectAll}
                handleSortChange={handleSortChange}
                sortBy={sortBy}
                selectedItems={selectedItems}
                noResultsMessage={
                  <NoResultsMessage
                    {...{ filters, itemsCount, list, search, currentPage, handlePageReset }}
                  />
                }
              />
            ) : (
              <PageLoading />
            )}
          </Container>
        </main>
      </Fragment>
    );
  }
}

export default withRouter(ListDetails);
