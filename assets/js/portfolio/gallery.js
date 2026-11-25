
        document.addEventListener('DOMContentLoaded', function () {
            let currentFilterType = 'category';
            let allArtworks = [];
            let $grid;

            // 生成所有分类按钮（同时生成两种分类）
            function generateAllFilters() {
                const pcFilterContainer = document.querySelector('.pc-filter');
                const mobileFilterContainer = document.querySelector('.mobile-filter');

                // 清空容器
                pcFilterContainer.innerHTML = '';
                mobileFilterContainer.innerHTML = '';

                // 创建两个分类容器
                const categoryGroup = document.createElement('div');
                categoryGroup.className = 'filter-group category-group';
                const timeGroup = document.createElement('div');
                timeGroup.className = 'filter-group time-group';

                // 生成分类按钮
                generateFilterGroup('category', categoryGroup);
                generateFilterGroup('time', timeGroup);

                // 生成移动端下拉菜单
                generateMobileFilters('category', mobileFilterContainer);
                generateMobileFilters('time', mobileFilterContainer);

                // 默认显示分类过滤
                timeGroup.style.display = 'none';
                mobileFilterContainer.querySelector('.time-group').style.display = 'none';

                // 添加到DOM
                pcFilterContainer.appendChild(categoryGroup);
                pcFilterContainer.appendChild(timeGroup);
            }

            // 生成单个分类组的按钮
            function generateFilterGroup(filterType, container) {
                const values = Array.from(new Set(allArtworks.map(item => item[filterType])));
                if (filterType === 'time') {
                    values.sort((a, b) => Number(b) - Number(a)); // 时间降序
                }

                // 添加"全部"按钮
                const allButton = document.createElement('button');
                allButton.className = 'active';
                allButton.dataset.filter = '*';
                allButton.textContent = '全部作品';
                container.appendChild(allButton);

                // 添加分类按钮
                values.forEach(value => {
                    const button = document.createElement('button');
                    button.dataset.filter = `.${filterType}-${value}`;
                    button.textContent = value;
                    container.appendChild(button);
                });
            }

            // 生成移动端下拉菜单
            function generateMobileFilters(filterType, container) {
                const values = Array.from(new Set(allArtworks.map(item => item[filterType])));
                if (filterType === 'time') {
                    values.sort((a, b) => Number(b) - Number(a));
                }

                const selectWrapper = document.createElement('div');
                selectWrapper.className = `mobile-filter-group ${filterType}-group`;
                const select = document.createElement('select');

                // 添加"全部"选项
                const allOption = document.createElement('option');
                allOption.value = '*';
                allOption.textContent = '全部作品';
                select.appendChild(allOption);

                // 添加分类选项
                values.forEach(value => {
                    const option = document.createElement('option');
                    option.value = `.${filterType}-${value}`;
                    option.textContent = value;
                    select.appendChild(option);
                });

                selectWrapper.appendChild(select);
                container.appendChild(selectWrapper);
            }

            // 生成图片项目
            function generatePortfolioItems() {
                const portfolioContainer = document.querySelector('.grid .row');
                portfolioContainer.innerHTML = '';

                allArtworks.forEach(art => {
                    const itemHTML = `
                            <div class="col-lg-6 col-md-6 col-xs-12 grid-item category-${art.category} time-${art.time}" data-artwork='${JSON.stringify(art).replace(/'/g, "&apos;")}'>
                                <div class="portfolio hover-style-4">
                                    <img src="../${art.path}" alt="${art.name}" loading="lazy" />
                                    <div class="portfolio-title3">
                                        <h3><a href="#">${art.name}</a></h3>
                                    </div>
                                </div>
                            </div>
                        `;
                    portfolioContainer.insertAdjacentHTML('beforeend', itemHTML);
                });


                // 新增：为所有图片绑定加载事件
                portfolioContainer.querySelectorAll('img').forEach(img => {
                    img.addEventListener('load', () => {
                        if ($grid) {
                            $grid.isotope('layout'); // 触发重排
                        }
                    });
                });
            }

            // 切换分类显示
            function toggleFilterDisplay(type) {
                // PC端切换
                document.querySelectorAll('.pc-filter .filter-group').forEach(group => {
                    group.style.display = group.classList.contains(`${type}-group`) ? 'block' :
                        'none';
                });

                // 移动端切换
                document.querySelectorAll('.mobile-filter-group').forEach(group => {
                    group.style.display = group.classList.contains(`${type}-group`) ? 'block' :
                        'none';
                });

                // 重置过滤状态
                $grid.isotope({
                    filter: '*'
                });
                document.querySelectorAll('button.active').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('button[data-filter="*"]').forEach(btn => btn.classList.add(
                    'active'));
                document.querySelectorAll('select').forEach(select => select.value = '*');
            }

            function initModal() {
                // 点击图片事件
                $(document).on('click', '.grid-item', function () {
                    const artwork = JSON.parse($(this).attr('data-artwork'));

                    // 填充数据
                    $('.modal-image').attr('src', `../${artwork.path}`);
                    $('.artwork-title').text(artwork.name);
                    $('.artwork-time').html(`<strong>创作时间:</strong> ${artwork.time}`);
                    $('.artwork-material').html(`<strong>材料:</strong> ${artwork.material}`);
                    $('.artwork-size').html(`<strong>尺寸:</strong> ${artwork.size}`);
                    $('.artwork-description').text(artwork.des || '暂无描述');

                    // 显示模态框
                    $('.art-modal').addClass('active');
                });

                // 关闭模态框
                $('.close-modal').on('click', () => {
                    $('.art-modal').removeClass('active');
                });

                // 点击背景关闭
                $(document).on('click', (e) => {
                    if ($(e.target).hasClass('art-modal')) {
                        $('.art-modal').removeClass('active');
                    }
                });

                // ESC键关闭
                $(document).on('keyup', (e) => {
                    if (e.key === "Escape") {
                        $('.art-modal').removeClass('active');
                    }
                });
            }


            // 初始化
            fetch('../artwork.json')
                .then(response => response.json())
                .then(artworks => {
                    allArtworks = artworks;

                    generatePortfolioItems();
                    generateAllFilters();
                    initModal(); // 初始化模态框功能

                    $('.grid').imagesLoaded(function () {
                        $grid = $('.grid').isotope({
                            itemSelector: '.grid-item',
                            percentPosition: true,
                            masonry: {
                                columnWidth: '.grid-item'
                            }
                        });

                        // PC端按钮事件
                        document.querySelectorAll('.pc-filter button').forEach(button => {
                            button.addEventListener('click', function () {
                                const filterValue = this.dataset.filter;
                                $grid.isotope({
                                    filter: filterValue
                                });
                                document.querySelectorAll('.pc-filter button')
                                    .forEach(btn => btn.classList.remove(
                                        'active'));
                                this.classList.add('active');
                            });
                        });

                        // 移动端下拉菜单事件
                        document.querySelectorAll('.mobile-filter-group select').forEach(
                            select => {
                                select.addEventListener('change', function () {
                                    const filterValue = this.value;
                                    $grid.isotope({
                                        filter: filterValue
                                    });
                                    document.querySelectorAll(
                                        `.pc-filter button[data-filter="${filterValue}"]`
                                    ).forEach(btn => {
                                        btn.click();
                                    });
                                });
                            });
                    });

                    // 切换按钮事件
                    document.querySelector('.filter-toggle').addEventListener('change', function () {
                        currentFilterType = this.checked ? 'time' : 'category';
                        toggleFilterDisplay(currentFilterType);
                    });
                });
        });
    